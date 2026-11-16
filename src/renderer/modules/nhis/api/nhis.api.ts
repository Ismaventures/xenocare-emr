// =============================================================================
// NHIS Module API Service
// =============================================================================

import { supabase } from '../../../api/supabaseClient';
import { sanitizeFilterValue } from '../../../lib/filterSanitizer';
import { autoVerifyNhisBillingOrder } from '../../billing/api/billing-order.api';
import { getDefaultNhisPercentage } from '../../billing/utils/coverage.utils';
import type {
  NhisProfile,
  CreateNhisProfileDTO,
  UpdateNhisProfileDTO,
  NhisAuthorization,
  CreateAuthorizationDTO,
  VerifyAuthorizationDTO,
  NhisPosting,
  CreatePostingDTO,
  NhisApproval,
  CreateApprovalRequestDTO,
  ApprovalDecisionDTO,
  NhisClaim,
  NhisExportBatch,
  NhisTariffRule,
  NhisPolicyConfig,
  NhisHmo,
  NhisProfileFilters,
  NhisAuthorizationFilters,
  NhisApprovalFilters,
  NhisClaimFilters,
  VerifyEncounterRequest,
  VerifyEncounterResponse,
  EmergencyOverrideRequest,
  EmergencyOverrideResponse,
  CanExecuteServiceRequest,
  CanExecuteServiceResponse,
  NhisDashboardStats,
  EncounterNhisState,
  NhisTariffGroup,
  NhisApprovalStatus,
  ProvisionalApprovalDTO,
  OfficialCodeEntryDTO,
  ServiceAuthorizationCheckResult,
  NhisAuthorizationService,
  ReferralQueueItem,
  CreateReferralQueueDTO,
  ProcessReferralQueueDTO,
  ReferralQueueFilters,
  CreateOutgoingReferralDTO,
  ApproveOutgoingReferralDTO,
  OutgoingReferralItem,
} from '../types';
import { createScopedLogger } from '../../../utils/logger';

const log = createScopedLogger('NhisAPI');

// =============================================================================
// NHIS Provisional Authorization API
// =============================================================================

// =============================================================================
// Referral Queue API
// =============================================================================

// =============================================================================
// OUTGOING NHIS EXTERNAL REFERRAL API FUNCTIONS
// For referring NHIS patients from NDC to external hospitals
// =============================================================================

type NhisBillingOrderRecord = {
  id: string;
  order_number?: string | null;
  patient_id?: string | null;
  encounter_id?: string | null;
  visit_id?: string | null;
  total_amount?: number | null;
  net_amount?: number | null;
  nhis_covered?: boolean | null;
  nhis_percentage?: number | null;
  nhis_payable?: number | null;
  status?: string | null;
  payment_method?: string | null;
  source_module?: string | null;
  patient?:
    | { patient_id?: string | null }
    | Array<{ patient_id?: string | null }>
    | null;
  visit?:
    | { visit_id?: string | null }
    | Array<{ visit_id?: string | null }>
    | null;
};

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function normalizeNhisPercentage(
  value: number | null | undefined,
): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return clampPercentage(value);
}

function resolveNhisCoveragePercentage(order: NhisBillingOrderRecord): number {
  const explicit = normalizeNhisPercentage(order.nhis_percentage);
  if (explicit !== null) return explicit;

  const total = Number(order.total_amount ?? order.net_amount ?? 0);
  const nhisPayable = Number(order.nhis_payable ?? 0);
  if (total > 0 && nhisPayable > 0) {
    return clampPercentage((nhisPayable / total) * 100);
  }

  return order.nhis_covered ? 100 : 0;
}

function resolveNhisPayable(
  order: NhisBillingOrderRecord,
  coveragePercentage: number,
): number {
  const existing = Number(order.nhis_payable ?? 0);
  if (existing > 0) return existing;

  const total = Number(order.total_amount ?? order.net_amount ?? 0);
  if (total <= 0 || coveragePercentage <= 0) return 0;
  return Number(((total * coveragePercentage) / 100).toFixed(2));
}

function getJoinedPatientDisplayId(
  order: NhisBillingOrderRecord,
): string | null {
  const patient = Array.isArray(order.patient)
    ? order.patient[0]
    : order.patient;
  return patient?.patient_id || null;
}

function getJoinedVisitDisplayId(order: NhisBillingOrderRecord): string | null {
  const visit = Array.isArray(order.visit) ? order.visit[0] : order.visit;
  return visit?.visit_id || null;
}

function generateNhisReceiptNumber(): string {
  const now = new Date();
  const yearStr = now.getFullYear().toString().slice(-2);
  const monthStr = (now.getMonth() + 1).toString().padStart(2, '0');
  const randomReceipt = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');
  return `RCP-${yearStr}${monthStr}-${randomReceipt}`;
}

async function resolveStaffDisplayId(
  actorUserId?: string,
  actorStaffId?: string,
): Promise<string | null> {
  if (actorStaffId) {
    const { data } = await supabase
      .from('staff')
      .select('staff_id')
      .eq('id', actorStaffId)
      .maybeSingle();
    if (data?.staff_id) return data.staff_id;
  }

  if (actorUserId) {
    const { data } = await supabase
      .from('staff')
      .select('staff_id')
      .eq('user_id', actorUserId)
      .maybeSingle();
    if (data?.staff_id) return data.staff_id;
  }

  return null;
}

async function ensureNhisReceiptForOrder(
  order: NhisBillingOrderRecord,
  actorStaffDisplayId: string | null,
): Promise<string | null> {
  const { data: existingReceipt } = await supabase
    .from('receipts')
    .select('receipt_number')
    .eq('billing_order_id', order.id)
    .eq('payment_method', 'NHIS')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingReceipt?.receipt_number) {
    return existingReceipt.receipt_number;
  }

  const coveragePercentage = resolveNhisCoveragePercentage(order);
  // Existing NHIS rule: auto-receipt generation is only for fully covered services.
  if (coveragePercentage < 100) {
    return null;
  }

  let patientDisplayId = getJoinedPatientDisplayId(order);
  if (!patientDisplayId && order.patient_id) {
    const { data: patient } = await supabase
      .from('patients')
      .select('patient_id')
      .eq('id', order.patient_id)
      .maybeSingle();
    patientDisplayId = patient?.patient_id || null;
  }

  if (!patientDisplayId) {
    log.warn(
      `[NHIS] Cannot create NHIS receipt for order ${order.order_number || order.id}: missing patient display ID`,
    );
    return null;
  }

  const visitDisplayId = getJoinedVisitDisplayId(order);
  const nhisPayable = resolveNhisPayable(order, coveragePercentage);
  const amountPaid = coveragePercentage >= 100 ? 0 : nhisPayable;
  const receiptNumber = generateNhisReceiptNumber();

  const { error: receiptError } = await supabase.from('receipts').insert({
    receipt_number: receiptNumber,
    billing_order_id: order.id,
    patient_id: patientDisplayId,
    visit_id: visitDisplayId ?? null,
    encounter_id: order.encounter_id ?? order.visit_id ?? null,
    amount_paid: amountPaid,
    payment_method: 'NHIS',
    issued_by: actorStaffDisplayId,
  });

  if (receiptError) {
    log.error(
      `[NHIS] Failed creating NHIS receipt for order ${order.order_number || order.id}`,
      receiptError,
    );
    return null;
  }

  return receiptNumber;
}

async function reconcileNhisBillingOrdersForEncounter(
  encounterId: string,
  actor: { userId?: string; staffId?: string } = {},
): Promise<void> {
  const { data: orders, error } = await supabase
    .from('billing_orders')
    .select(
      `
      id, order_number, patient_id, encounter_id, visit_id,
      total_amount, net_amount, nhis_covered, nhis_percentage, nhis_payable,
      status, payment_method, source_module,
      patient:patients(patient_id),
      visit:visits!billing_orders_encounter_id_fkey(visit_id)
      `,
    )
    .eq('encounter_id', encounterId)
    .eq('nhis_covered', true);

  if (error || !orders?.length) {
    if (error) {
      log.error(
        '[NHIS] Failed loading encounter billing orders for reconciliation',
        error,
      );
    }
    return;
  }

  const staffDisplayId = await resolveStaffDisplayId(
    actor.userId,
    actor.staffId,
  );

  for (const rawOrder of orders) {
    const order = rawOrder as unknown as NhisBillingOrderRecord;
    const coveragePercentage = resolveNhisCoveragePercentage(order);
    if (coveragePercentage <= 0) continue;

    const nhisPayable = resolveNhisPayable(order, coveragePercentage);

    await supabase
      .from('billing_orders')
      .update({
        nhis_covered: true,
        nhis_percentage: coveragePercentage,
        nhis_payable: nhisPayable,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    await supabase
      .from('billing_items')
      .update({
        nhis_covered: true,
        nhis_percentage: coveragePercentage,
        updated_at: new Date().toISOString(),
      })
      .eq('billing_order_id', order.id)
      .or('nhis_covered.is.null,nhis_covered.eq.false,nhis_percentage.is.null');

    const isPendingLike = ['pending', 'awaiting_payment'].includes(
      String(order.status || '').toLowerCase(),
    );

    // Existing NHIS rule: only 100% coverage can be auto-verified.
    if (coveragePercentage >= 100 && isPendingLike) {
      const autoVerified = await autoVerifyNhisBillingOrder(order.id);
      if (!autoVerified) {
        await ensureNhisReceiptForOrder(order, staffDisplayId);
      }
      continue;
    }

    // For non-100% coverage, keep admin verification flow; no auto-receipt generation.
    if (coveragePercentage >= 100) {
      await ensureNhisReceiptForOrder(order, staffDisplayId);
    }
  }
}

// =============================================================================
// NHIS Profiles API
// =============================================================================

export async function fetchNhisProfiles(filters: NhisProfileFilters = {}) {
  const { page = 1, limit = 20, ...queryFilters } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('nhis_profiles')
    .select(
      `
      *,
      patient:patients!patient_id (
        id, patient_id, emr_number, first_name, middle_name, surname,
        gender, date_of_birth, contact_phone, nhis_number, service_number,
        nhis_patient_source, referral_code, referring_facility_name,
        referring_facility_nhis_id, referral_date, referral_reason,
        referral_status, referral_expiry_date, clinical_summary,
        insurance_type, patient_category, patient_type,
        payer_info, rank, military_branch, unit, occupation, employer,
        residential_address, blood_group, nationality, state_of_origin, lga,
        nok_name, nok_relationship, nok_phone, nok_address
      ),
      policy_config:nhis_policy_config!policy_config_id (*),
      verified_by_staff:staff!verified_by (id, first_name, last_name)
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (queryFilters.scheme_type) {
    query = query.eq('scheme_type', queryFilters.scheme_type);
  }
  if (queryFilters.status) {
    query = query.eq('status', queryFilters.status);
  }
  if (queryFilters.patient_origin) {
    query = query.eq('patient_origin', queryFilters.patient_origin);
  }
  if (queryFilters.provider_name) {
    query = query.ilike('provider_name', `%${queryFilters.provider_name}%`);
  }
  if (queryFilters.search) {
    // Search in patient name or enrollee_id
    const safeSearch = sanitizeFilterValue(queryFilters.search);
    query = query.or(`enrollee_id.ilike.%${safeSearch}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data as NhisProfile[], count: count || 0 };
}

export async function fetchNhisProfileByPatientId(patientId: string) {
  const { data, error } = await supabase
    .from('nhis_profiles')
    .select(
      `
      *,
      patient:patients!patient_id (
        id, patient_id, emr_number, first_name, middle_name, surname,
        gender, date_of_birth, contact_phone, nhis_number, service_number,
        nhis_patient_source, referral_code, referring_facility_name,
        referring_facility_nhis_id, referral_date, referral_reason,
        referral_status, referral_expiry_date, clinical_summary,
        insurance_type, patient_category, patient_type,
        payer_info, rank, military_branch, unit, occupation, employer,
        residential_address, blood_group, nationality, state_of_origin, lga,
        nok_name, nok_relationship, nok_phone, nok_address
      ),
      policy_config:nhis_policy_config!policy_config_id (*),
      verified_by_staff:staff!verified_by (id, first_name, last_name)
    `,
    )
    .eq('patient_id', patientId)
    .maybeSingle();

  if (error) throw error;
  return data as NhisProfile | null;
}

export async function createNhisProfile(dto: CreateNhisProfileDTO) {
  const { data, error } = await supabase
    .from('nhis_profiles')
    .insert(dto)
    .select()
    .single();

  if (error) throw error;
  return data as NhisProfile;
}

export async function updateNhisProfile(
  profileId: string,
  dto: UpdateNhisProfileDTO,
) {
  const { data, error } = await supabase
    .from('nhis_profiles')
    .update({ ...dto, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .select()
    .single();

  if (error) throw error;
  return data as NhisProfile;
}

// =============================================================================
// NHIS Authorizations API
// =============================================================================

export async function fetchNhisAuthorizations(
  filters: NhisAuthorizationFilters = {},
) {
  const { page = 1, limit = 20, ...queryFilters } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('nhis_authorizations')
    .select(
      `
      *,
      patient:patients!patient_id (id, patient_id, emr_number, first_name, surname),
      verified_by_staff:staff!verified_by (id, first_name, last_name)
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (queryFilters.status) {
    query = query.eq('status', queryFilters.status);
  }
  if (queryFilters.source) {
    query = query.eq('source', queryFilters.source);
  }
  if (queryFilters.patient_id) {
    query = query.eq('patient_id', queryFilters.patient_id);
  }
  if (queryFilters.auth_code) {
    query = query.ilike('auth_code', `%${queryFilters.auth_code}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data as NhisAuthorization[], count: count || 0 };
}

export async function fetchActiveAuthorization(patientId: string) {
  const { data, error } = await supabase
    .from('nhis_authorizations')
    .select('*')
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .gte('expiry_date', new Date().toISOString())
    .order('expiry_date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as NhisAuthorization | null;
}

export async function createNhisAuthorization(dto: CreateAuthorizationDTO) {
  // Get policy config for validity calculation
  const { data: policyConfig } = await supabase
    .from('nhis_policy_config')
    .select('validity_days')
    .eq('is_active', true)
    .limit(1)
    .single();

  const validityDays = dto.validity_days || policyConfig?.validity_days || 30;
  const startDate = dto.start_date ? new Date(dto.start_date) : new Date();
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + validityDays);

  const { data, error } = await supabase
    .from('nhis_authorizations')
    .insert({
      patient_id: dto.patient_id,
      nhis_profile_id: dto.nhis_profile_id,
      auth_code: dto.auth_code,
      auth_type: dto.auth_type || 'standard',
      start_date: startDate.toISOString(),
      expiry_date: expiryDate.toISOString(),
      source: dto.source || 'internal_enrollee',
      verification_notes: dto.verification_notes,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as NhisAuthorization;
}

export async function verifyAuthorization(dto: VerifyAuthorizationDTO) {
  const { data, error } = await supabase
    .from('nhis_authorizations')
    .update({
      status: 'active',
      verified_by: dto.verified_by,
      verified_at: new Date().toISOString(),
      verification_notes: dto.verification_notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dto.auth_id)
    .select()
    .single();

  if (error) throw error;
  return data as NhisAuthorization;
}

export async function revokeAuthorization(
  authId: string,
  revokedBy: string,
  reason: string,
) {
  const { data, error } = await supabase
    .from('nhis_authorizations')
    .update({
      status: 'revoked',
      revoked_by: revokedBy,
      revoked_at: new Date().toISOString(),
      revocation_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', authId)
    .select()
    .single();

  if (error) throw error;
  return data as NhisAuthorization;
}

/**
 * Create a provisional authorization (when NHIS code is not yet available)
 */
export async function createProvisionalAuthorization(
  dto: ProvisionalApprovalDTO,
  approvedBy: string,
): Promise<NhisAuthorization> {
  const { data, error } = await supabase.rpc('nhis_provisional_approve', {
    p_patient_id: dto.patient_id,
    p_service_type: dto.service_type,
    p_reason: dto.reason,
    p_approved_by: approvedBy,
    p_encounter_id: dto.encounter_id || null,
    p_expiry_days: dto.expiry_days || 30,
  });

  if (error) throw error;

  // Fetch the created authorization
  return fetchNhisAuthorizationById(data as string);
}

/**
 * Enter official NHIS code for a provisional authorization
 */
export async function enterOfficialCode(
  dto: OfficialCodeEntryDTO,
  enteredBy: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('nhis_enter_official_code', {
    p_authorization_id: dto.authorization_id,
    p_official_code: dto.official_code,
    p_entered_by: enteredBy,
  });

  if (error) throw error;
  return data as boolean;
}

/**
 * Check if a patient has valid authorization for a specific service type
 */
export async function checkServiceAuthorization(
  patientId: string,
  serviceType: string,
  encounterId?: string,
): Promise<ServiceAuthorizationCheckResult> {
  const { data, error } = await supabase.rpc(
    'nhis_check_service_authorization',
    {
      p_patient_id: patientId,
      p_service_type: serviceType,
      p_encounter_id: encounterId || null,
    },
  );

  if (error) throw error;

  // RPC returns array, get first result
  const result = Array.isArray(data) ? data[0] : data;
  return result as ServiceAuthorizationCheckResult;
}

/**
 * Fetch provisional authorizations awaiting official codes
 */
export async function fetchProvisionalAuthorizationsAwaitingCode(
  limit: number = 50,
) {
  const { data, error } = await supabase
    .from('nhis_provisional_awaiting_code')
    .select('*')
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Fetch authorizations expiring soon
 */
export async function fetchAuthorizationsExpiringSoon(limit: number = 50) {
  const { data, error } = await supabase
    .from('nhis_authorizations_expiring_soon')
    .select('*')
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Fetch authorization service summary statistics
 */
export async function fetchAuthorizationServiceSummary() {
  const { data, error } = await supabase
    .from('nhis_authorization_service_summary')
    .select('*');

  if (error) throw error;
  return data;
}

/**
 * Add a service to an authorization
 */
export async function addServiceToAuthorization(
  authorizationId: string,
  serviceType: string,
  serviceId: string | null,
  serviceTable: string | null,
  approvedBy: string,
  notes?: string,
): Promise<NhisAuthorizationService> {
  const { data, error } = await supabase
    .from('nhis_authorization_services')
    .insert({
      authorization_id: authorizationId,
      service_type: serviceType,
      service_id: serviceId,
      service_table: serviceTable,
      approved_by: approvedBy,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as NhisAuthorizationService;
}

/**
 * Fetch services covered by an authorization
 */
export async function fetchAuthorizationServices(
  authorizationId: string,
): Promise<NhisAuthorizationService[]> {
  const { data, error } = await supabase
    .from('nhis_authorization_services')
    .select('*')
    .eq('authorization_id', authorizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as NhisAuthorizationService[];
}

/**
 * Fetch single authorization by ID
 */
export async function fetchNhisAuthorizationById(
  authId: string,
): Promise<NhisAuthorization> {
  const { data, error } = await supabase
    .from('nhis_authorizations')
    .select(
      `
      *,
      patient:patients!patient_id (
        id, patient_id, emr_number, first_name, surname
      ),
      verified_by_staff:staff!verified_by (id, first_name, last_name),
      provisional_approved_by_staff:staff!provisional_approved_by (id, first_name, last_name)
    `,
    )
    .eq('id', authId)
    .single();

  if (error) throw error;
  return data as NhisAuthorization;
}

// =============================================================================
// NHIS Specialty Referral Integration API
// =============================================================================

/**
 * Check if a patient has an active NHIS profile
 */
export async function isNhisPatient(patientId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('nhis_profiles')
    .select('id')
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

/**
 * Create NHIS approval request for specialty referral
 * Call this when creating an internal specialty referral for an NHIS patient
 */
export async function createSpecialtyReferralApproval(
  referralRequestId: string,
  patientId: string,
  specialty: string,
  reason: string,
  requestedBy: string,
  estimatedCost?: number,
): Promise<NhisApproval | null> {
  // First check if patient is NHIS
  const isPatientNhis = await isNhisPatient(patientId);
  if (!isPatientNhis) {
    return null; // Not an NHIS patient, no approval needed
  }

  // Map specialty to service type
  const serviceTypeMap: Record<string, string> = {
    dental: 'dental_referral',
    ophthalmology: 'ophthalmology_referral',
    physiotherapy: 'physiotherapy_referral',
  };

  // Create NHIS approval request
  const { data, error } = await supabase
    .from('nhis_approvals')
    .insert({
      patient_id: patientId,
      service_type: serviceTypeMap[specialty] || 'specialty_referral',
      service_name: `${specialty.charAt(0).toUpperCase() + specialty.slice(1)} Referral`,
      service_request_id: referralRequestId,
      reason,
      estimated_cost: estimatedCost || 0,
      requested_by: requestedBy,
      requested_at: new Date().toISOString(),
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as NhisApproval;
}

/**
 * Get NHIS approval status for a specialty referral
 */
export async function getSpecialtyReferralApprovalStatus(
  referralRequestId: string,
): Promise<{ status: NhisApprovalStatus; approvalId?: string } | null> {
  const { data, error } = await supabase
    .from('nhis_approvals')
    .select('id, status')
    .eq('service_request_id', referralRequestId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    status: data.status as NhisApprovalStatus,
    approvalId: data.id,
  };
}

// =============================================================================
// NHIS Encounter Verification API
// =============================================================================

export async function verifyNhisEncounter(
  request: VerifyEncounterRequest,
): Promise<VerifyEncounterResponse> {
  const { data, error } = await supabase.rpc('verify_nhis_encounter', {
    p_encounter_id: request.encounter_id,
    p_auth_id: request.auth_id,
    p_verified_by: request.verified_by,
    p_tariff_group: request.tariff_group,
  });

  if (error) throw error;

  const response = data as VerifyEncounterResponse;
  if (response.success && response.encounter_id) {
    try {
      await reconcileNhisBillingOrdersForEncounter(response.encounter_id, {
        userId: request.verified_by,
      });
    } catch (reconcileError) {
      log.error(
        '[NHIS] Encounter verify reconciliation failed (non-fatal):',
        reconcileError,
      );
    }
  }

  return response;
}

export async function emergencyOverride(
  request: EmergencyOverrideRequest,
): Promise<EmergencyOverrideResponse> {
  const { data, error } = await supabase.rpc('nhis_emergency_override', {
    p_encounter_id: request.encounter_id,
    p_override_by: request.override_by,
    p_reason: request.reason,
  });

  if (error) throw error;
  return data as EmergencyOverrideResponse;
}

export async function getEncounterNhisState(
  encounterId: string,
): Promise<EncounterNhisState | null> {
  const { data, error } = await supabase
    .from('visits')
    .select(
      `
      id,
      payer_type,
      nhis_auth_id,
      nhis_verification_status,
      nhis_verified_by,
      nhis_verified_at,
      nhis_tariff_group,
      nhis_policy_snapshot,
      nhis_override_reason,
      nhis_override_by,
      nhis_override_at,
      requires_post_authorization
    `,
    )
    .eq('id', encounterId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  return {
    encounter_id: data.id,
    payer_type: data.payer_type || 'private',
    nhis_auth_id: data.nhis_auth_id,
    nhis_verification_status: data.nhis_verification_status || 'not_applicable',
    nhis_verified_by: data.nhis_verified_by,
    nhis_verified_at: data.nhis_verified_at,
    nhis_tariff_group: data.nhis_tariff_group,
    nhis_policy_snapshot: data.nhis_policy_snapshot,
    nhis_override_reason: data.nhis_override_reason,
    nhis_override_by: data.nhis_override_by,
    nhis_override_at: data.nhis_override_at,
    requires_post_authorization: data.requires_post_authorization || false,
  };
}

export async function setEncounterPayerType(
  encounterId: string,
  payerType: 'private' | 'nhis' | 'retainership' | 'military_free',
) {
  const verificationStatus =
    payerType === 'nhis' ? 'unverified' : 'not_applicable';

  const { data, error } = await supabase
    .from('visits')
    .update({
      payer_type: payerType,
      nhis_verification_status: verificationStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', encounterId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// NHIS Postings API
// =============================================================================

export async function fetchNhisPostings(
  filters: { status?: string; date?: string; clinic_id?: string } = {},
) {
  let query = supabase
    .from('nhis_postings')
    .select(
      `
      *,
      patient:patients!patient_id (id, patient_id, first_name, surname),
      clinic:clinics!clinic_id (id, clinic_name),
      doctor:staff!doctor_id (id, first_name, last_name)
    `,
    )
    .order('posted_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.date) {
    query = query.eq('appointment_date', filters.date);
  }
  if (filters.clinic_id) {
    query = query.eq('clinic_id', filters.clinic_id);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as NhisPosting[];
}

export async function createNhisPosting(dto: CreatePostingDTO) {
  const { data, error } = await supabase
    .from('nhis_postings')
    .insert(dto)
    .select()
    .single();

  if (error) throw error;
  return data as NhisPosting;
}

export async function updatePostingStatus(
  postingId: string,
  status: string,
  staffId?: string,
) {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'seen') {
    updates.seen_at = new Date().toISOString();
  } else if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  } else if (status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString();
    updates.cancelled_by = staffId;
  }

  const { data, error } = await supabase
    .from('nhis_postings')
    .update(updates)
    .eq('id', postingId)
    .select()
    .single();

  if (error) throw error;
  return data as NhisPosting;
}

// =============================================================================
// NHIS Approvals API
// =============================================================================

export async function fetchNhisApprovals(filters: NhisApprovalFilters = {}) {
  const { page = 1, limit = 20, search, ...queryFilters } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('nhis_approvals')
    .select(
      `
      *,
      patient:patients!patient_id (id, patient_id, first_name, surname, emr_number),
      encounter:visits!encounter_id (id, encounter_number),
      requested_by_staff:staff!requested_by (id, first_name, last_name),
      decided_by_staff:staff!decided_by (id, first_name, last_name)
    `,
      { count: 'exact' },
    )
    .order('requested_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (queryFilters.status) {
    query = query.eq('status', queryFilters.status);
  }
  if (queryFilters.service_type) {
    query = query.eq('service_type', queryFilters.service_type);
  }
  if (queryFilters.exclude_category) {
    query = query.neq('service_category', queryFilters.exclude_category);
  }
  if (queryFilters.patient_id) {
    query = query.eq('patient_id', queryFilters.patient_id);
  }
  if (queryFilters.encounter_id) {
    query = query.eq('encounter_id', queryFilters.encounter_id);
  }
  // Search by service_name (server-side text search)
  if (search && search.trim()) {
    query = query.ilike('service_name', `%${search.trim()}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data as NhisApproval[], count: count || 0 };
}

export async function fetchPendingApprovals() {
  return fetchNhisApprovals({ status: 'pending' });
}

/**
 * Fetch provisional approvals (approved provisionally, awaiting official NHIS codes)
 * These are service approvals that have been granted provisional approval
 * but still need the official authorization code from NHIS
 */
export async function fetchProvisionalApprovals(limit = 50) {
  const { data, error } = await supabase
    .from('nhis_approvals')
    .select(
      `
      *,
      patient:patients!nhis_approvals_patient_id_fkey (
        id, first_name, middle_name, surname, emr_number, nhis_number
      ),
      encounter:visits!nhis_approvals_encounter_id_fkey (
        id, encounter_number, visit_type, start_time
      ),
      requester:staff!nhis_approvals_requested_by_fkey (
        id, first_name, last_name
      ),
      decider:staff!nhis_approvals_decided_by_fkey (
        id, first_name, last_name
      )
    `,
    )
    .eq('status', 'provisional')
    .order('decided_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return { data: data as NhisApproval[], count: data?.length || 0 };
}

export async function createApprovalRequest(dto: CreateApprovalRequestDTO) {
  const { data, error } = await supabase
    .from('nhis_approvals')
    .insert({
      ...dto,
      status: 'pending',
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Update the service request's approval status
  await updateServiceApprovalStatus(
    dto.service_type,
    dto.service_request_id,
    'pending',
  );

  return data as NhisApproval;
}

export async function processApprovalDecision(dto: ApprovalDecisionDTO) {
  const { data: approval, error } = await supabase
    .from('nhis_approvals')
    .update({
      status: dto.decision,
      decided_by: dto.decided_by,
      decided_at: new Date().toISOString(),
      decision_notes: dto.decision_notes,
      rejection_reason: dto.rejection_reason,
      authorization_code: dto.authorization_code,
      authorization_date: dto.authorization_date || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dto.approval_id)
    .select()
    .single();

  if (error) throw error;

  // Get the approval to update the service request
  const approvalData = approval as NhisApproval;
  await updateServiceApprovalStatus(
    approvalData.service_type,
    approvalData.service_request_id,
    dto.decision,
  );

  // For physio plans, also store the authorization code directly on the plan
  // and waive payment on approval (NHIS covers the cost).
  if (
    approvalData.service_type === 'physiotherapy_plan' ||
    approvalData.service_type === 'physiotherapy_plan_extension'
  ) {
    const physioUpdate: Record<string, unknown> = {
      nhis_approval_status:
        dto.decision === 'provisional' ? 'approved' : dto.decision,
      updated_at: new Date().toISOString(),
    };
    if (dto.authorization_code) {
      physioUpdate.nhis_authorization_code = dto.authorization_code;
    }
    // On NHIS approval, determine coverage from the encounter's insurance type.
    // - 100% coverage → waive payment, sessions unlock immediately
    // - < 100% coverage → keep payment_status = 'pending_billing' so the
    //   "Bill" button appears and staff creates a billing order for the copay
    if (dto.decision === 'approved' || dto.decision === 'provisional') {
      // Look up the encounter's insurance type to determine NHIS coverage
      const { data: visitData } = await supabase
        .from('visits')
        .select('insurance_type, payment_category')
        .eq('id', approvalData.encounter_id)
        .maybeSingle();

      const insuranceType = visitData?.insurance_type || visitData?.payment_category || 'Cash';
      // Use the shared coverage utility to determine percentage
      const nhisPercentage = getDefaultNhisPercentage(insuranceType, 'Physiotherapy');
      // 100% coverage → waive. < 100% → keep pending_billing so staff can bill copay.
      physioUpdate.payment_status = nhisPercentage >= 100 ? 'waived' : 'pending_billing';
    }

    // For approved extensions, update sessions_approved to match new total
    // so the session cap reflects the NHIS-cleared count.
    if (
      approvalData.service_type === 'physiotherapy_plan_extension' &&
      (dto.decision === 'approved' || dto.decision === 'provisional')
    ) {
      const { data: planData } = await supabase
        .from('physio_plans')
        .select('total_sessions_planned')
        .eq('plan_id', approvalData.service_request_id)
        .single();
      if (planData) {
        physioUpdate.sessions_approved = planData.total_sessions_planned;
      }
    }

    await supabase
      .from('physio_plans')
      .update(physioUpdate)
      .eq('plan_id', approvalData.service_request_id);
  }

  // NHIS approvals must leave auditable NHIS receipts on related billing orders,
  // whether fully covered (100%) or partially covered.
  if (dto.decision === 'approved' || dto.decision === 'provisional') {
    try {
      const encounterId = approvalData.encounter_id;
      if (encounterId) {
        await reconcileNhisBillingOrdersForEncounter(encounterId, {
          staffId: dto.decided_by,
        });
      }
    } catch (reconcileError) {
      log.error(
        '[NHIS] Post-decision billing reconciliation failed (non-fatal):',
        reconcileError,
      );
    }
  }

  return approvalData;
}

async function updateServiceApprovalStatus(
  serviceType: string,
  serviceId: string,
  status: NhisApprovalStatus,
) {
  let tableName: string;
  let idColumn: string;

  switch (serviceType) {
    case 'lab_request':
      tableName = 'lab_requests';
      idColumn = 'request_id';
      break;
    case 'radiology_request':
      tableName = 'radiology_requests';
      idColumn = 'request_id';
      break;
    case 'prescription':
      tableName = 'prescriptions';
      idColumn = 'prescription_id';
      break;
    case 'specialty_referral':
    case 'dental_referral':
    case 'ophthalmology_referral':
    case 'physiotherapy_referral':
    case 'referral':
      tableName = 'clinical_requests';
      idColumn = 'id';
      break;
    case 'procedure':
    case 'surgery':
    case 'clinical_request':
      tableName = 'clinical_requests';
      idColumn = 'id';
      break;
    case 'consultation':
      tableName = 'consultations';
      idColumn = 'consultation_id';
      break;
    case 'admission':
      tableName = 'admissions';
      idColumn = 'id';
      break;
    // Specialty clinic tables
    case 'dental_procedure':
      tableName = 'dental_procedures';
      idColumn = 'procedure_id';
      break;
    case 'dental_prescription':
      tableName = 'dental_prescriptions';
      idColumn = 'prescription_id';
      break;
    case 'eye_exam':
      tableName = 'eye_exams';
      idColumn = 'exam_id';
      break;
    case 'eye_procedure':
      tableName = 'eye_procedures';
      idColumn = 'procedure_id';
      break;
    case 'eye_prescription':
      tableName = 'eye_prescriptions';
      idColumn = 'prescription_id';
      break;
    case 'physiotherapy_plan':
    case 'physiotherapy_plan_extension':
      tableName = 'physio_plans';
      idColumn = 'plan_id';
      break;
    default:
      log.warn(
        `Unknown service type for NHIS approval update: ${serviceType}`,
      );
      return; // Unknown service type
  }

  await supabase
    .from(tableName)
    .update({
      nhis_approval_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq(idColumn, serviceId);
}

// =============================================================================
// Service Release API
// =============================================================================

export async function releaseServiceToBilling(
  serviceType: string,
  serviceId: string,
  releasedBy: string,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('release_service_to_billing', {
    p_service_type: serviceType,
    p_service_id: serviceId,
    p_released_by: releasedBy,
  });

  if (error) throw error;
  return data as { success: boolean; error?: string };
}

export async function canExecuteService(
  request: CanExecuteServiceRequest,
): Promise<CanExecuteServiceResponse> {
  const { data, error } = await supabase.rpc('can_execute_nhis_service', {
    p_encounter_id: request.encounter_id,
    p_service_type: request.service_type,
    p_service_id: request.service_id,
  });

  if (error) throw error;
  return data as CanExecuteServiceResponse;
}

// =============================================================================
// NHIS Claims API
// =============================================================================

export async function fetchNhisClaims(filters: NhisClaimFilters = {}) {
  const { page = 1, limit = 20, ...queryFilters } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('nhis_claims')
    .select(
      `
      *,
      patient:patients!patient_id (id, patient_id, first_name, surname),
      encounter:visits!encounter_id (id, visit_id, encounter_date)
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (queryFilters.status) {
    query = query.eq('status', queryFilters.status);
  }
  if (queryFilters.tariff_group) {
    query = query.eq('tariff_group', queryFilters.tariff_group);
  }
  if (queryFilters.provider_name) {
    query = query.ilike('provider_name', `%${queryFilters.provider_name}%`);
  }
  if (queryFilters.patient_id) {
    query = query.eq('patient_id', queryFilters.patient_id);
  }
  if (queryFilters.date_from) {
    query = query.gte('created_at', queryFilters.date_from);
  }
  if (queryFilters.date_to) {
    query = query.lte('created_at', queryFilters.date_to);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data as NhisClaim[], count: count || 0 };
}

export async function generateClaim(encounterId: string, createdBy: string) {
  const { data, error } = await supabase.rpc('generate_nhis_claim', {
    p_encounter_id: encounterId,
    p_created_by: createdBy,
  });

  if (error) throw error;
  return data as {
    success: boolean;
    claim_id?: string;
    claim_number?: string;
    total_tariff?: number;
    claimable_amount?: number;
    patient_pay?: number;
    error?: string;
  };
}

export async function updateClaimStatus(
  claimId: string,
  status: string,
  staffId: string,
  notes?: string,
) {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'reviewed') {
    updates.reviewed_by = staffId;
    updates.reviewed_at = new Date().toISOString();
    updates.review_notes = notes;
  } else if (status === 'approved') {
    updates.approved_by = staffId;
    updates.approved_at = new Date().toISOString();
  } else if (status === 'submitted') {
    updates.submitted_by = staffId;
    updates.submitted_at = new Date().toISOString();
  } else if (status === 'rejected') {
    updates.rejected_by = staffId;
    updates.rejected_at = new Date().toISOString();
    updates.rejection_reason = notes;
  }

  const { data, error } = await supabase
    .from('nhis_claims')
    .update(updates)
    .eq('id', claimId)
    .select()
    .single();

  if (error) throw error;
  return data as NhisClaim;
}

// =============================================================================
// Export Batches API
// =============================================================================

export async function fetchExportBatches(
  filters: { status?: string; provider?: string } = {},
) {
  let query = supabase
    .from('nhis_export_batches')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.provider) {
    query = query.ilike('provider_name', `%${filters.provider}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as NhisExportBatch[];
}

export async function createExportBatch(
  periodStart: string,
  periodEnd: string,
  providerName: string | null,
  createdBy: string,
) {
  const batchNumber = `EXP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
    Math.random() * 10000,
  )
    .toString()
    .padStart(4, '0')}`;

  // Get pending claims for the period
  let claimsQuery = supabase
    .from('nhis_claims')
    .select('id, claimable_amount')
    .eq('status', 'approved')
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd);

  if (providerName) {
    claimsQuery = claimsQuery.eq('provider_name', providerName);
  }

  const { data: claims, error: claimsError } = await claimsQuery;
  if (claimsError) throw claimsError;

  const claimIds = claims?.map((c) => c.id) || [];
  const totalAmount =
    claims?.reduce((sum, c) => sum + (c.claimable_amount || 0), 0) || 0;

  const { data, error } = await supabase
    .from('nhis_export_batches')
    .insert({
      batch_number: batchNumber,
      export_type: 'monthly',
      period_start: periodStart,
      period_end: periodEnd,
      provider_name: providerName,
      total_claims: claimIds.length,
      total_amount: totalAmount,
      claim_ids: claimIds,
      status: 'draft',
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  // Update claims to reference this batch
  if (claimIds.length > 0) {
    await supabase
      .from('nhis_claims')
      .update({ export_batch_id: data.id, status: 'submitted' })
      .in('id', claimIds);
  }

  return data as NhisExportBatch;
}

// =============================================================================
// Tariff Rules API
// =============================================================================

export async function fetchTariffRules(tariffGroup?: NhisTariffGroup) {
  let query = supabase
    .from('nhis_tariff_rules')
    .select('*')
    .eq('is_active', true)
    .order('service_type');

  if (tariffGroup) {
    query = query.eq('tariff_group', tariffGroup);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as NhisTariffRule[];
}

export async function getTariffForService(
  tariffGroup: NhisTariffGroup,
  serviceType: string,
  serviceId?: string,
): Promise<NhisTariffRule | null> {
  let query = supabase
    .from('nhis_tariff_rules')
    .select('*')
    .eq('tariff_group', tariffGroup)
    .eq('service_type', serviceType)
    .eq('is_active', true)
    .lte('effective_from', new Date().toISOString().slice(0, 10));

  if (serviceId) {
    query = query.eq('service_id', serviceId);
  }

  const { data, error } = await query.limit(1).single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as NhisTariffRule | null;
}

// =============================================================================
// Policy Config API
// =============================================================================

export async function fetchPolicyConfigs() {
  const { data, error } = await supabase
    .from('nhis_policy_config')
    .select('*')
    .order('provider_name');

  if (error) throw error;
  return data as NhisPolicyConfig[];
}

export async function getActivePolicyConfig(
  providerName?: string,
): Promise<NhisPolicyConfig | null> {
  let query = supabase
    .from('nhis_policy_config')
    .select('*')
    .eq('is_active', true);

  if (providerName) {
    query = query.eq('provider_name', providerName);
  }

  const { data, error } = await query.limit(1).single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as NhisPolicyConfig | null;
}

// =============================================================================
// HMO List API
// =============================================================================

export async function fetchNhisHmos() {
  const { data, error } = await supabase
    .from('nhis_hmos')
    .select('*')
    .order('name');

  if (error) throw error;
  return data as NhisHmo[];
}

// =============================================================================
// Dashboard Statistics API
// =============================================================================

export async function fetchNhisDashboardStats(): Promise<NhisDashboardStats> {
  // =========================================================================
  // PAGINATION HELPER: Supabase limits results to 1,000 rows by default.
  // Without this, billing totals are silently truncated for large datasets.
  // =========================================================================
  const STATS_BATCH_SIZE = 1000;
  async function fetchAllBillingRows<T = any>(
    queryBuilder: any,
  ): Promise<{ data: T[]; error: any }> {
    const allData: T[] = [];
    let offset = 0;
    let hasMore = true;
    let lastError: any = null;
    while (hasMore) {
      const { data, error } = await queryBuilder.range(
        offset,
        offset + STATS_BATCH_SIZE - 1,
      );
      if (error) {
        lastError = error;
        break;
      }
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData.push(...data);
        hasMore = data.length >= STATS_BATCH_SIZE;
        offset += STATS_BATCH_SIZE;
      }
    }
    return { data: allData, error: lastError };
  }

  // Parallel queries for efficiency
  const [
    profilesResult,
    activeProfilesResult,
    pendingAuthsResult,
    activeAuthsResult,
    pendingApprovalsResult,
    provisionalApprovalsResult,
    pendingClaimsResult,
    claimsAmountResult,
    referredResult,
    emergencyResult,
    // Count patients with NHIS number (registered NHIS patients at facility)
    nhisRegisteredPatientsResult,
    // Total NHIS billing amounts from billing_items (per-service level, single source of truth)
    nhisBillingItemsResult,
  ] = await Promise.all([
    supabase.from('nhis_profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('nhis_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('nhis_authorizations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('nhis_authorizations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('nhis_approvals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    // Count provisional approvals (awaiting official NHIS codes)
    supabase
      .from('nhis_approvals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'provisional'),
    supabase
      .from('nhis_claims')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'pending', 'reviewed']),
    supabase
      .from('nhis_claims')
      .select('claimable_amount')
      .in('status', ['pending', 'reviewed', 'approved']),
    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('nhis_patient_source', 'Referral'),
    supabase
      .from('visits')
      .select('id', { count: 'exact', head: true })
      .eq('nhis_verification_status', 'emergency_override'),
    // Count all patients who have an nhis_number (NHIS registered patients)
    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .not('nhis_number', 'is', null),
    // Sum total NHIS billing from billing_items (pre-computed per-service NHIS prices)
    // This is the SINGLE SOURCE OF TRUTH - matches what claims section uses
    // Uses pagination to fetch ALL rows (no silent truncation)
    fetchAllBillingRows(
      supabase
        .from('billing_items')
        .select('nhis_payable')
        .eq('nhis_covered', true)
        .gt('nhis_payable', 0),
    ),
  ]);

  const totalClaimsAmount = (claimsAmountResult.data || []).reduce(
    (sum, c) => sum + (c.claimable_amount || 0),
    0,
  );

  // Calculate total NHIS billing from billing_items (pre-computed prices, paginated)
  const totalNhisBillingAmount = (nhisBillingItemsResult.data || []).reduce(
    (sum, item: any) => sum + (item.nhis_payable || 0),
    0,
  );

  return {
    total_profiles: profilesResult.count || 0,
    active_profiles: activeProfilesResult.count || 0,
    pending_authorizations: pendingAuthsResult.count || 0,
    active_authorizations: activeAuthsResult.count || 0,
    pending_approvals: pendingApprovalsResult.count || 0,
    provisional_approvals: provisionalApprovalsResult.count || 0,
    pending_claims: pendingClaimsResult.count || 0,
    total_claims_amount: totalClaimsAmount,
    total_nhis_billing_amount: totalNhisBillingAmount,
    referred_patients_count: referredResult.count || 0,
    emergency_overrides_count: emergencyResult.count || 0,
    // Total NHIS registered patients at facility
    // Use the count of NHIS profiles as the primary source, fallback to patients with NHIS number
    total_nhis_patients:
      profilesResult.count && profilesResult.count > 0
        ? profilesResult.count
        : nhisRegisteredPatientsResult.count || 0,
  };
}

// =============================================================================
// Comprehensive NHIS Pending Claims Aggregation
// =============================================================================

/**
 * Fetch all NHIS pending claims across all service modules
 * This aggregates approved/covered NHIS services that are awaiting claim submission
 */
export interface NhisPendingClaimsSummary {
  total_amount: number;
  total_items: number;
  by_category: {
    lab: { count: number; amount: number };
    radiology: { count: number; amount: number };
    pharmacy: { count: number; amount: number };
    procedure: { count: number; amount: number };
    specialty: { count: number; amount: number };
    consultation: { count: number; amount: number };
    admission: { count: number; amount: number };
  };
  items: NhisPendingClaimItem[];
}

export interface NhisPendingClaimItem {
  id: string;
  service_type:
    | 'lab'
    | 'radiology'
    | 'pharmacy'
    | 'procedure'
    | 'specialty'
    | 'consultation'
    | 'admission'
    | 'physiotherapy';
  service_name: string;
  patient_id: string;
  patient_name: string;
  emr_number: string;
  encounter_id: string;
  encounter_number?: string;
  authorization_code?: string;
  authorization_status: string;
  amount: number;
  service_date: string;
  approved_by?: string;
  approved_at?: string;
}

export async function fetchNhisPendingClaimsSummary(): Promise<NhisPendingClaimsSummary> {
  // ---------------------------------------------------------------------------
  // SINGLE SOURCE OF TRUTH: billing_items with nhis_covered = true
  // These contain the real service costs (unit_price, gross_amount, nhis_payable)
  // even when NHIS pays 100% and patient_payable is 0.
  // ---------------------------------------------------------------------------
  const BATCH = 1000;
  async function fetchAllRows<T = any>(qb: any): Promise<T[]> {
    const all: T[] = [];
    let offset = 0;
    let more = true;
    while (more) {
      const { data, error } = await qb.range(offset, offset + BATCH - 1);
      if (error || !data || data.length === 0) { more = false; break; }
      all.push(...data);
      more = data.length >= BATCH;
      offset += BATCH;
    }
    return all;
  }

  // Fetch all NHIS-covered billing items with their billing_order context
  const billingItems = await fetchAllRows<any>(
    supabase
      .from('billing_items')
      .select(`
        id, billing_order_id, item_type, item_name, service_name,
        quantity, unit_price, unit_cost, total_price, gross_amount,
        nhis_covered, nhis_percentage, nhis_payable, patient_payable,
        service_reference_id, status, created_at,
        billing_order:billing_orders!billing_order_id (
          id, order_number, patient_id, encounter_id, created_at,
          patient:patients!patient_id (emr_number, first_name, middle_name, surname),
          encounter:visits!visit_id (visit_id, encounter_number, encounter_date)
        )
      `)
      .eq('nhis_covered', true),
  );

  // Map item_type to our category keys
  const typeToCategoryMap: Record<string, NhisPendingClaimItem['service_type']> = {
    'Lab': 'lab',
    'Laboratory': 'lab',
    'Radiology': 'radiology',
    'Imaging': 'radiology',
    'Pharmacy': 'pharmacy',
    'Drug': 'pharmacy',
    'Procedure': 'procedure',
    'Surgery': 'procedure',
    'Specialty': 'specialty',
    'Referral': 'specialty',
    'Consultation': 'consultation',
    'Admission': 'admission',
    'Physiotherapy': 'physiotherapy',
  };

  const allItems: NhisPendingClaimItem[] = billingItems.map((bi: any) => {
    const patient = bi.billing_order?.patient;
    const encounter = bi.billing_order?.encounter;
    const rawType = (bi.item_type || 'Other').trim();
    const serviceType = typeToCategoryMap[rawType] || 'consultation';

    // Use gross_amount (full service cost) as the amount — this reflects the true
    // cost of the service. nhis_payable is what NHIS owes, which may equal gross_amount
    // when NHIS covers 100%.
    const amount = bi.gross_amount || bi.total_price || bi.nhis_payable || (bi.unit_price * (bi.quantity || 1)) || 0;

    return {
      id: bi.id,
      service_type: serviceType,
      service_name: bi.service_name || bi.item_name || rawType,
      patient_id: bi.billing_order?.patient_id || '',
      patient_name: patient
        ? [patient.first_name, patient.middle_name, patient.surname].filter(Boolean).join(' ')
        : '',
      emr_number: patient?.emr_number || '',
      encounter_id: bi.billing_order?.encounter_id || '',
      encounter_number: encounter?.encounter_number,
      authorization_code: undefined,
      authorization_status: bi.status || 'approved',
      amount,
      service_date: bi.created_at || bi.billing_order?.created_at || '',
    };
  });

  // Build category aggregation
  const categoryBuckets: Record<string, { count: number; amount: number }> = {
    lab: { count: 0, amount: 0 },
    radiology: { count: 0, amount: 0 },
    pharmacy: { count: 0, amount: 0 },
    procedure: { count: 0, amount: 0 },
    specialty: { count: 0, amount: 0 },
    consultation: { count: 0, amount: 0 },
    admission: { count: 0, amount: 0 },
  };

  for (const item of allItems) {
    const cat = item.service_type as string;
    if (categoryBuckets[cat]) {
      categoryBuckets[cat].count += 1;
      categoryBuckets[cat].amount += item.amount;
    } else {
      // Map physiotherapy etc. into consultation bucket
      categoryBuckets.consultation.count += 1;
      categoryBuckets.consultation.amount += item.amount;
    }
  }

  return {
    total_amount: allItems.reduce((sum, item) => sum + item.amount, 0),
    total_items: allItems.length,
    by_category: {
      lab: categoryBuckets.lab,
      radiology: categoryBuckets.radiology,
      pharmacy: categoryBuckets.pharmacy,
      procedure: categoryBuckets.procedure,
      specialty: categoryBuckets.specialty,
      consultation: categoryBuckets.consultation,
      admission: categoryBuckets.admission,
    },
    items: allItems.sort(
      (a, b) =>
        new Date(b.service_date).getTime() - new Date(a.service_date).getTime(),
    ),
  };
}

/**
 * Extract authorization code from status or notes
 */
function extractAuthCode(status: string): string | undefined {
  // If status contains auth code pattern, extract it
  return undefined;
}

function extractAuthCodeFromNotes(notes: string | null): string | undefined {
  if (!notes) return undefined;
  const match = notes.match(/\[AUTH CODE:\s*([^\]]+)\]/i);
  return match ? match[1].trim() : undefined;
}

// =============================================================================
// Fetch All Provisional Approvals Across Modules
// =============================================================================

export interface ProvisionalApprovalItem {
  id: string;
  service_type: 'lab' | 'radiology' | 'pharmacy' | 'procedure' | 'specialty';
  service_name: string;
  patient_id: string;
  patient_name: string;
  emr_number: string;
  encounter_id: string;
  encounter_number?: string;
  provisional_reason?: string;
  approved_at?: string;
  approved_by_name?: string;
  urgency?: string;
}

export async function fetchAllProvisionalApprovals(): Promise<
  ProvisionalApprovalItem[]
> {
  // Fetch all services with provisional approval status (noted in review_notes)
  // For now, we check for [PROVISIONAL] prefix in review_notes or specific status

  const [specialtyResult] = await Promise.all([
    // Specialty referrals with provisional approval
    supabase
      .from('clinical_requests')
      .select(
        `
        id, specialty_module, clinical_reason, patient_id, encounter_id,
        nhis_approval_status, review_notes, approved_at, urgency,
        patient:patients!patient_id (emr_number, first_name, middle_name, surname),
        encounter:visits!clinical_requests_encounter_id_fkey (encounter_number),
        approved_by_staff:staff!approved_by (first_name, last_name)
      `,
      )
      .eq('request_type', 'Referral')
      .eq('nhis_approval_status', 'approved')
      .ilike('review_notes', '%[PROVISIONAL]%'),
  ]);

  const items: ProvisionalApprovalItem[] = [];

  // Process specialty results
  (specialtyResult.data || []).forEach((r: any) => {
    items.push({
      id: r.id,
      service_type: 'specialty',
      service_name: `${r.specialty_module || 'Specialty'} Referral`,
      patient_id: r.patient_id,
      patient_name: [
        r.patient?.first_name,
        r.patient?.middle_name,
        r.patient?.surname,
      ]
        .filter(Boolean)
        .join(' '),
      emr_number: r.patient?.emr_number || '',
      encounter_id: r.encounter_id,
      encounter_number: r.encounter?.encounter_number,
      provisional_reason: r.review_notes?.replace('[PROVISIONAL]', '').trim(),
      approved_at: r.approved_at,
      approved_by_name: r.approved_by_staff
        ? `${r.approved_by_staff.first_name} ${r.approved_by_staff.last_name}`
        : undefined,
      urgency: r.urgency,
    });
  });

  return items;
}

/**
 * Verify a provisional approval with an official authorization code
 */
export async function verifyProvisionalApproval(
  itemId: string,
  serviceType: 'lab' | 'radiology' | 'pharmacy' | 'procedure' | 'specialty',
  authorizationCode: string,
  verifiedBy: string,
): Promise<void> {
  // Get staff ID from user ID
  const { data: staffData } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', verifiedBy)
    .maybeSingle();

  const staffId = staffData?.id;
  if (!staffId) {
    throw new Error('Staff record not found for current user');
  }

  if (serviceType === 'specialty') {
    // Update clinical_request to remove [PROVISIONAL] and add verified auth code
    const { data: existing } = await supabase
      .from('clinical_requests')
      .select('review_notes')
      .eq('id', itemId)
      .single();

    const existingNotes = existing?.review_notes || '';
    // Remove [PROVISIONAL] and add [VERIFIED AUTH CODE: xxx]
    const updatedNotes = existingNotes
      .replace(/\[PROVISIONAL\]\s*/i, '')
      .trim();
    const verifiedNotes =
      `[AUTH CODE: ${authorizationCode}] [VERIFIED] ${updatedNotes}`.trim();

    const { error } = await supabase
      .from('clinical_requests')
      .update({
        review_notes: verifiedNotes,
        reviewed_by: staffId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) throw error;
  }
  // Add similar handling for other service types as needed
}

// =============================================================================
// Audit Log API
// =============================================================================

export async function fetchNhisAuditLog(
  filters: {
    entity_type?: string;
    entity_id?: string;
    patient_id?: string;
    action_type?: string;
    limit?: number;
  } = {},
) {
  let query = supabase
    .from('nhis_audit_log')
    .select(
      `
      *,
      performer:staff!performed_by (id, first_name, last_name)
    `,
    )
    .order('performed_at', { ascending: false })
    .limit(filters.limit || 100);

  if (filters.entity_type) {
    query = query.eq('entity_type', filters.entity_type);
  }
  if (filters.entity_id) {
    query = query.eq('entity_id', filters.entity_id);
  }
  if (filters.patient_id) {
    query = query.eq('patient_id', filters.patient_id);
  }
  if (filters.action_type) {
    query = query.eq('action_type', filters.action_type);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function fetchReferralQueue(filters: ReferralQueueFilters = {}) {
  const { page = 1, limit = 50, ...queryFilters } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('nhis_referral_queue')
    .select(
      `
      *,
      patient:patients!patient_id (
        id,
        patient_id,
        first_name,
        middle_name,
        surname,
        emr_number,
        service_number,
        phone:contact_phone,
        gender,
        date_of_birth,
        residential_address,
        patient_category,
        patient_type,
        insurance_type,
        rank,
        unit,
        military_branch,
        title,
        course,
        occupation,
        employer,
        nhis_number,
        nhis_patient_source,
        referral_code,
        referring_facility_name,
        referring_facility_nhis_id,
        referral_date,
        referral_reason,
        referral_status,
        referral_expiry_date,
        clinical_summary,
        payer_info
      ),
      requester:staff!requested_by (
        id,
        first_name,
        last_name
      ),
      processor:staff!processed_by (
        id,
        first_name,
        last_name
      ),
      requesting_doctor:staff!requesting_doctor_id (
        id,
        first_name,
        last_name,
        department
      ),
      target_clinic:clinics!target_clinic_id (
        id,
        clinic_name,
        clinic_code
      ),
      target_doctor:staff!target_doctor_id (
        id,
        first_name,
        last_name
      )
    `,
      { count: 'exact' },
    )
    .order('requested_at', { ascending: true }) // FIFO - oldest first
    .range(offset, offset + limit - 1);

  if (queryFilters.request_type) {
    if (Array.isArray(queryFilters.request_type)) {
      query = query.in('request_type', queryFilters.request_type);
    } else {
      query = query.eq('request_type', queryFilters.request_type);
    }
  }
  // Only apply status filter if it's a valid status (not 'all')
  if (queryFilters.status && queryFilters.status !== 'all') {
    query = query.eq('status', queryFilters.status);
  }
  if (queryFilters.priority && queryFilters.priority !== 'all') {
    query = query.eq('priority', queryFilters.priority);
  }
  if (queryFilters.is_expired !== undefined) {
    // Filter by expired referrals (referral_date > 30 days ago)
    const expiredThreshold = new Date();
    expiredThreshold.setDate(expiredThreshold.getDate() - 30);
    const expiredDateStr = expiredThreshold.toISOString().split('T')[0];

    if (queryFilters.is_expired) {
      query = query
        .not('referral_date', 'is', null)
        .lt('referral_date', expiredDateStr);
    } else {
      query = query.or(
        `referral_date.is.null,referral_date.gte.${expiredDateStr}`,
      );
    }
  }
  if (queryFilters.search) {
    // Search is handled on frontend for now due to complex joins
  }

  const { data, error, count } = await query;

  if (error) throw error;

  // Transform the data to match our interface and compute days_since_referral / is_expired
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const transformedData = (data || []).map((item: any) => {
    // Compute days_since_referral and is_expired from referral_date
    let days_since_referral: number | null = null;
    let is_expired = false;

    if (item.referral_date) {
      const refDate = new Date(item.referral_date);
      refDate.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - refDate.getTime();
      days_since_referral = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      is_expired = days_since_referral > 30;
    }

    return {
      ...item,
      days_since_referral,
      is_expired,
      patient: item.patient
        ? {
            ...item.patient,
            phone: item.patient.contact_phone,
            hmo: item.patient.hmo?.[0] || item.patient.hmo || null,
          }
        : undefined,
    };
  });

  return { data: transformedData as ReferralQueueItem[], count: count || 0 };
}

export async function createReferralQueueItem(dto: CreateReferralQueueDTO) {
  const { data, error } = await supabase
    .from('nhis_referral_queue')
    .insert({
      patient_id: dto.patient_id,
      request_type: dto.request_type || 'external_referral',
      referral_code: dto.referral_code,
      referral_date: dto.referral_date,
      referral_source: dto.referral_source,
      referral_facility_nhis_id: dto.referral_facility_nhis_id,
      clinical_basis: dto.clinical_basis,
      referring_clinician: dto.referring_clinician,
      priority: dto.priority || 'normal',
      requested_by: dto.requested_by,
      request_notes: dto.request_notes,
      status: 'pending',
      // Clinic selection for external NHIS - encounter created after NHIS approval
      target_clinic_id: dto.target_clinic_id,
      target_doctor_id: dto.target_doctor_id,
      visit_type: dto.visit_type,
      chief_complaint: dto.chief_complaint,
      // For internal referrals - link to clinical_requests
      clinical_request_id: dto.clinical_request_id,

      // ============ CLINICAL DATA FIELDS (for NHIS officer processing) ============
      // These fields are REQUIRED for internal NHIS requests
      diagnosis: dto.diagnosis,
      diagnosis_codes: dto.diagnosis_codes,
      examination_findings: dto.examination_findings,
      history_of_present_illness: dto.history_of_present_illness,
      clinical_notes: dto.clinical_notes,
      treatment_plan: dto.treatment_plan,

      // Service-specific fields
      service_type: dto.service_type,
      service_name: dto.service_name,
      urgency: dto.urgency,
      estimated_cost: dto.estimated_cost,

      // Source encounter reference
      source_encounter_id: dto.source_encounter_id,
      requesting_doctor_id: dto.requesting_doctor_id,
      specialty_module: dto.specialty_module,

      // Admission-specific fields
      admission_type: dto.admission_type,
      level_of_care: dto.level_of_care,
      expected_duration: dto.expected_duration,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ReferralQueueItem;
}

export async function processReferralQueueItem(dto: ProcessReferralQueueDTO) {
  // Use the database function for proper processing
  const { data, error } = await supabase.rpc('process_nhis_referral_queue', {
    p_queue_id: dto.queue_id,
    p_action: dto.action,
    p_processed_by: dto.processed_by,
    p_notes: dto.processing_notes || null,
    p_rejection_reason: dto.rejection_reason || null,
    p_auth_code: dto.auth_code || null,
    p_tariff_group: dto.tariff_group || 'Civilian_HMO',
    // Metadata overrides
    p_referral_source: dto.referral_source || null,
    p_referral_code: dto.referral_code || null,
    p_referral_date: dto.referral_date || null,
    p_referral_reason: dto.referral_reason || null,
    p_referring_clinician: dto.referring_clinician || null,
  });

  if (error) throw error;

  // ---------------------------------------------------------------------------
  // Post-RPC NHIS billing reconciliation
  // Ensures approved NHIS services always get NHIS receipt coverage records.
  // Full coverage (100%) is auto-verified; partial coverage keeps billing flow.
  // ---------------------------------------------------------------------------
  if (dto.action === 'approve' && data?.success && data?.encounter_id) {
    try {
      const encounterId = data.encounter_id as string;

      // 1) Find the billing order the RPC just created for this encounter
      const { data: billingOrder } = await supabase
        .from('billing_orders')
        .select('id, encounter_id, nhis_covered, nhis_percentage, status')
        .eq('encounter_id', encounterId)
        .eq('nhis_covered', true)
        .in('status', ['Pending', 'Awaiting_Payment'])
        .maybeSingle();

      if (billingOrder) {
        // 2) Look up the clinic name from the encounter to build a proper service name
        const { data: encounter } = await supabase
          .from('visits')
          .select('clinic_id, visit_type, clinic:clinics(clinic_name)')
          .eq('id', encounterId)
          .maybeSingle();

        const clinicRecord = encounter?.clinic;
        const clinicName =
          (Array.isArray(clinicRecord)
            ? clinicRecord[0]?.clinic_name
            : (clinicRecord as any)?.clinic_name) || 'Consultation';
        const visitType = encounter?.visit_type || 'Consultation';
        const serviceName = `${clinicName} - ${visitType}`;

        // 3) Keep source module aligned to consultation flow for referral approvals.
        const coveragePercentage =
          normalizeNhisPercentage((billingOrder as any).nhis_percentage) ?? 100;
        await supabase
          .from('billing_orders')
          .update({
            nhis_covered: true,
            nhis_percentage: coveragePercentage,
            source_module: 'consultation',
            updated_at: new Date().toISOString(),
          })
          .eq('id', billingOrder.id);

        // 4) Update billing items service_name from generic "Consultation Fee (NHIS)" to clinic-based name
        await supabase
          .from('billing_items')
          .update({
            item_name: serviceName,
            service_name: serviceName,
            nhis_covered: true,
            nhis_percentage: coveragePercentage,
            updated_at: new Date().toISOString(),
          })
          .eq('billing_order_id', billingOrder.id);

        // 5) Reconcile NHIS receipts and auto-verify only if full coverage.
        await reconcileNhisBillingOrdersForEncounter(encounterId, {
          userId: dto.processed_by,
        });

        // 6) Only bypass Billing queue when fully covered by NHIS.
        if (coveragePercentage >= 100) {
          await supabase
            .from('queue')
            .update({
              location: 'Nursing',
              notes: 'NHIS 100% auto-verified. Proceed to nursing assessment.',
              updated_at: new Date().toISOString(),
            })
            .eq('encounter_id', encounterId)
            .eq('location', 'Billing');
        }

        log.info(
          `[NHIS] Reconciled referral billing order for encounter ${encounterId} — service: ${serviceName} (${coveragePercentage}% NHIS coverage)`,
        );
      } else {
        // Even if we don't detect a fresh pending order, reconcile any NHIS billing on encounter.
        await reconcileNhisBillingOrdersForEncounter(encounterId, {
          userId: dto.processed_by,
        });
      }
    } catch (autoVerifyErr) {
      // Non-fatal: log but don't fail the approval
      log.error(
        '[NHIS] Post-approval billing reconciliation failed (non-fatal):',
        autoVerifyErr,
      );
    }
  }

  return data;
}

export async function getReferralQueueStats() {
  // Calculate expired date threshold (30 days ago)
  const expiredThreshold = new Date();
  expiredThreshold.setDate(expiredThreshold.getDate() - 30);
  const expiredDateStr = expiredThreshold.toISOString().split('T')[0];

  // Count BOTH external_referral and internal_nhis_approval items in the queue stats
  const queueTypes = ['external_referral', 'internal_nhis_approval'];
  const [
    pendingResult,
    expiredResult,
    approvedTodayResult,
    rejectedTodayResult,
    internalPendingResult,
  ] = await Promise.all([
    supabase
      .from('nhis_referral_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .in('request_type', queueTypes),
    // Expired = pending items where referral_date is more than 30 days ago
    supabase
      .from('nhis_referral_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .in('request_type', queueTypes)
      .not('referral_date', 'is', null)
      .lt('referral_date', expiredDateStr),
    supabase
      .from('nhis_referral_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .in('request_type', queueTypes)
      .gte('processed_at', new Date().toISOString().split('T')[0]),
    supabase
      .from('nhis_referral_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected')
      .in('request_type', queueTypes)
      .gte('processed_at', new Date().toISOString().split('T')[0]),
    // Separate count for internal approvals pending
    supabase
      .from('nhis_referral_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('request_type', 'internal_nhis_approval'),
  ]);

  return {
    pending: pendingResult.count || 0,
    expired: expiredResult.count || 0,
    approved_today: approvedTodayResult.count || 0,
    rejected_today: rejectedTodayResult.count || 0,
    internal_pending: internalPendingResult.count || 0,
  };
}

// =============================================================================
// Specialty Referrals Pending NHIS Approval
// =============================================================================

/**
 * Fetch specialty referrals (from clinical_requests) that are pending NHIS approval.
 * These are internal referrals for NHIS patients to specialty clinics like
 * Dental, Ophthalmology, Physiotherapy, Surgery, etc.
 */
export interface PendingSpecialtyReferral {
  id: string;
  patient_id: string;
  patient_name: string;
  emr_number: string;
  encounter_id: string;
  encounter_number?: string;
  specialty: string;
  referral_reason: string;
  clinical_notes?: string;
  clinical_findings?: string;
  provisional_diagnosis?: string;
  urgency: 'Routine' | 'Urgent' | 'Stat' | 'Emergency';
  referred_by: string;
  referred_by_name?: string;
  referred_at: string;
  nhis_status: 'pending' | 'approved' | 'provisional' | 'rejected';
  nhis_authorization_id?: string;
  nhis_approval_notes?: string;
}

/**
 * Map specialty module name to queue department location
 * Used after NHIS approval to route the encounter to the correct specialty queue
 */
function getSpecialtyQueueLocationForNhis(
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
    case 'skin':
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
    case 'obstetrics_gynaecology':
      return 'Gynaecology';
    case 'oral_maxillofacial':
    case 'oral & maxillofacial':
      return 'Oral & Maxillofacial';
    case 'pulmonology':
    case 'chest':
      return 'Pulmonology';
    case 'endocrinology':
      return 'Endocrinology';
    case 'plastic_surgery':
      return 'Plastic Surgery';
    case 'nutrition':
    case 'dietetics':
      return 'Nutrition';
    case 'psychiatry':
      return 'Psychiatry';
    case 'oncology':
      return 'Oncology';
    case 'rheumatology':
      return 'Rheumatology';
    case 'infectious_disease':
    case 'retroviral':
      return 'Infectious Disease';
    case 'haematology':
    case 'hematology':
      return 'Haematology';
    case 'cardiothoracic_surgery':
      return 'Cardiothoracic Surgery';
    case 'vascular_surgery':
      return 'Vascular Surgery';
    case 'paediatric_surgery':
    case 'pediatric_surgery':
      return 'Paediatric Surgery';
    case 'neonatology':
      return 'Neonatology';
    default:
      if (specialtyModule)
        return (
          specialtyModule.charAt(0).toUpperCase() + specialtyModule.slice(1)
        );
      return 'Consultation';
  }
}

// =============================================================================
// Booked NHIS Referrals — View Only for NHIS Desk
// =============================================================================

/**
 * Interface for booked NHIS referrals visible to the NHIS desk.
 * These are NHIS patients who have appointment booked at Internal Referral tab
 * but no encounter has been created yet. NHIS can VIEW but NOT approve.
 */
export interface BookedNhisReferral {
  id: string;
  request_number: string;
  patient_id: string;
  patient_name: string;
  emr_number: string;
  specialty_module: string;
  referral_reason: string;
  urgency: string;
  referred_by_name: string;
  referred_at: string;
  appointment_date: string | null;
  appointment_time: string | null;
  referral_workflow_status: string;
  insurance_type: string | null;
  patient_category: string | null;
  nhis_number: string | null;
}

/**
 * Fetch booked NHIS referrals for the NHIS desk (view only).
 * Shows NHIS patients who have been booked for specialty clinic appointments
 * but encounters have NOT been created yet.
 * NHIS staff can view these patients grouped by clinic but cannot approve until
 * the encounter is created from the Internal Referral section.
 */
export async function fetchBookedNhisReferrals(): Promise<
  BookedNhisReferral[]
> {
  const { data, error } = await supabase
    .from('clinical_requests')
    .select(
      `
      id,
      request_number,
      encounter_id,
      created_at,
      urgency,
      specialty_module,
      referral_workflow_status,
      appointment_date,
      appointment_time,
      clinical_reason,
      patient:patients!patient_id (
        id,
        emr_number,
        first_name,
        middle_name,
        surname,
        patient_category,
        insurance_type,
        nhis_number
      ),
      requesting_doctor:staff!requesting_doctor_id (
        first_name,
        last_name
      )
    `,
    )
    .eq('request_type', 'Referral')
    .eq('referral_workflow_status', 'Appointment_Booked')
    .is('referral_encounter_id', null)
    .not('status', 'in', '("Cancelled","Rejected")')
    .order('specialty_module', { ascending: true })
    .order('appointment_date', { ascending: true });

  if (error) {
    log.error('Error fetching booked NHIS referrals:', error);
    throw error;
  }

  // Filter to only include NHIS patients; exclude direct bookings (no encounter_id)
  const nhisReferrals = (data || []).filter((r: any) => {
    if (!r.encounter_id) return false; // Direct bookings have no encounter; skip from NHIS view
    const insuranceType = r.patient?.insurance_type?.toLowerCase() || '';
    const category = r.patient?.patient_category?.toLowerCase() || '';
    return insuranceType.includes('nhis') || category.includes('nhis');
  });

  return nhisReferrals.map((r: any) => ({
    id: r.id,
    request_number: r.request_number,
    patient_id: r.patient?.id,
    patient_name: [
      r.patient?.first_name,
      r.patient?.middle_name,
      r.patient?.surname,
    ]
      .filter(Boolean)
      .join(' '),
    emr_number: r.patient?.emr_number || '',
    specialty_module: r.specialty_module || 'other',
    referral_reason: r.clinical_reason || '',
    urgency: r.urgency || 'Routine',
    referred_by_name: r.requesting_doctor
      ? `${r.requesting_doctor.first_name} ${r.requesting_doctor.last_name}`
      : 'Unknown',
    referred_at: r.created_at,
    appointment_date: r.appointment_date,
    appointment_time: r.appointment_time,
    referral_workflow_status: r.referral_workflow_status,
    insurance_type: r.patient?.insurance_type,
    patient_category: r.patient?.patient_category,
    nhis_number: r.patient?.nhis_number,
  }));
}

export async function fetchPendingSpecialtyReferrals(): Promise<
  PendingSpecialtyReferral[]
> {
  const { data, error } = await supabase
    .from('clinical_requests')
    .select(
      `
      id,
      request_number,
      patient_id,
      encounter_id,
      specialty_module,
      clinical_reason,
      notes,
      clinical_findings,
      provisional_diagnosis,
      urgency,
      requesting_doctor_id,
      nhis_approval_status,
      nhis_authorization_id,
      created_at,
      patient:patients!patient_id (
        id,
        emr_number,
        first_name,
        middle_name,
        surname
      ),
      encounter:visits!clinical_requests_encounter_id_fkey (
        encounter_number
      ),
      requesting_doctor:staff!requesting_doctor_id (
        first_name,
        last_name
      )
    `,
    )
    .eq('request_type', 'Referral')
    .eq('nhis_approval_status', 'pending')
    .not('specialty_module', 'is', null)
    .order('urgency', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    log.error('Error fetching pending specialty referrals:', error);
    throw error;
  }

  // Transform to PendingSpecialtyReferral type
  return (data || []).map((r: any) => ({
    id: r.id,
    patient_id: r.patient_id,
    patient_name: [
      r.patient?.first_name,
      r.patient?.middle_name,
      r.patient?.surname,
    ]
      .filter(Boolean)
      .join(' '),
    emr_number: r.patient?.emr_number || '',
    encounter_id: r.encounter_id,
    encounter_number: r.encounter?.encounter_number,
    specialty: r.specialty_module || 'other',
    referral_reason: r.clinical_reason || '',
    clinical_notes: r.notes,
    clinical_findings: r.clinical_findings,
    provisional_diagnosis: r.provisional_diagnosis,
    urgency: r.urgency || 'Routine',
    referred_by: r.requesting_doctor_id,
    referred_by_name: r.requesting_doctor
      ? `${r.requesting_doctor.first_name} ${r.requesting_doctor.last_name}`
      : undefined,
    referred_at: r.created_at,
    nhis_status:
      r.nhis_approval_status === 'pending' ? 'pending' : r.nhis_approval_status,
    nhis_authorization_id: r.nhis_authorization_id,
  }));
}

/**
 * Approve a specialty referral for NHIS
 */
export async function approveSpecialtyReferral(
  referralId: string,
  approvedBy: string, // This is auth.users.id
  isProvisional: boolean = false,
  notes?: string,
  authorizationCode?: string,
): Promise<void> {
  // Get staff ID from user ID (approved_by FK references staff.id, not auth.users.id)
  const { data: staffData } = await supabase
    .from('staff')
    .select('id, staff_id')
    .eq('user_id', approvedBy)
    .single();

  const staffId = staffData?.id;
  const staffDisplayId = staffData?.staff_id; // VARCHAR display ID for receipts
  if (!staffId) {
    throw new Error('Staff record not found for current user');
  }

  // Database constraint only allows: not_required, pending, approved, rejected, expired
  // Use 'approved' for both regular and provisional approvals
  const newStatus = 'approved';

  // Build approval notes with authorization code if provided
  let approvalNotes = '';
  if (isProvisional) {
    approvalNotes = `[PROVISIONAL] ${notes || ''}`.trim();
  } else {
    // For regular approval, include the authorization code in the notes
    const codeNote = authorizationCode
      ? `[AUTH CODE: ${authorizationCode}]`
      : '';
    approvalNotes = [codeNote, notes].filter(Boolean).join(' ').trim();
  }

  // Build update object
  const updateData: Record<string, any> = {
    nhis_approval_status: newStatus,
    approved_by: staffId, // Use staff.id, not auth.users.id
    approved_at: new Date().toISOString(),
    review_notes: approvalNotes || null,
    updated_at: new Date().toISOString(),
  };

  // Update clinical_request
  const { error: crError } = await supabase
    .from('clinical_requests')
    .update(updateData)
    .eq('id', referralId);

  if (crError) {
    log.error('Error approving specialty referral:', crError);
    throw crError;
  }

  // Also update the nhis_approvals entry if it exists
  const { data: crData } = await supabase
    .from('clinical_requests')
    .select('nhis_authorization_id')
    .eq('id', referralId)
    .single();

  if (crData?.nhis_authorization_id) {
    const approvalUpdate: Record<string, any> = {
      status: newStatus,
      approved_by: staffId, // Use staff.id
      approved_at: new Date().toISOString(),
      decision_notes: notes,
      is_provisional: isProvisional,
    };

    // Add authorization code if provided
    if (authorizationCode) {
      approvalUpdate.authorization_code = authorizationCode;
    }

    await supabase
      .from('nhis_approvals')
      .update(approvalUpdate)
      .eq('id', crData.nhis_authorization_id);
  }

  // Also sync the nhis_referral_queue entry if one was auto-created by the DB trigger
  await supabase
    .from('nhis_referral_queue')
    .update({
      status: 'approved',
      processed_by: staffId,
      processed_at: new Date().toISOString(),
      processing_notes: approvalNotes || 'Approved via Specialty Referrals tab',
      auth_code: authorizationCode || null,
    })
    .eq('clinical_request_id', referralId)
    .eq('request_type', 'internal_nhis_approval');

  // =========================================================================
  // ROUTING: After NHIS approval, create auto-verified billing record
  // (NHIS consultations are FREE - 100% covered), then route to Nursing.
  // Flow: NHIS Approval → Billing (auto-verified) → Nursing → Specialty Queue
  // =========================================================================
  try {
    const { data: referralData } = await supabase
      .from('clinical_requests')
      .select(
        'referral_encounter_id, specialty_module, patient_id, encounter_id',
      )
      .eq('id', referralId)
      .single();

    if (referralData?.referral_encounter_id) {
      // Encounter was already created from Internal Referral tab
      const specialtyTarget = getSpecialtyQueueLocationForNhis(
        referralData.specialty_module,
      );

      // Get the encounter's clinic_id and visit details
      const { data: encounterData } = await supabase
        .from('visits')
        .select('clinic_id, visit_type, visit_id')
        .eq('id', referralData.referral_encounter_id)
        .single();

      // Get patient's insurance_type and display patient_id for billing
      const { data: patientData } = await supabase
        .from('patients')
        .select('insurance_type, patient_id')
        .eq('id', referralData.patient_id)
        .single();

      // Update the encounter's NHIS verification status to verified
      await supabase
        .from('visits')
        .update({
          nhis_verification_status: 'verified',
          updated_at: new Date().toISOString(),
        })
        .eq('id', referralData.referral_encounter_id);

      // =======================================================================
      // BILLING: Auto-create and auto-verify billing for NHIS consultation
      // NHIS consultations are 100% free — billing record required for audit
      // =======================================================================
      let receiptNumber: string | null = null;
      try {
        const insuranceType = patientData?.insurance_type || '';
        const clinicId = encounterData?.clinic_id;
        const visitType = encounterData?.visit_type || 'Follow-up';

        // Get consultation fee from clinic pricing — single source of truth
        // Uses base fee columns (consultation_fee, follow_up_fee, emergency_fee) for ALL insurance types
        let consultFee = 0;
        let feeDescription = 'Specialty Referral Consultation';
        if (clinicId) {
          const { data: clinicPricing } = await supabase
            .from('clinics')
            .select(
              'clinic_name, consultation_fee, follow_up_fee, emergency_fee',
            )
            .eq('id', clinicId)
            .single();

          if (clinicPricing) {
            // Single source of truth: always use the base fee columns
            let fee = 0;
            if (visitType === 'Follow-up') {
              fee =
                clinicPricing.follow_up_fee ||
                clinicPricing.consultation_fee ||
                0;
            } else if (visitType === 'Emergency') {
              fee =
                clinicPricing.emergency_fee ||
                clinicPricing.consultation_fee ||
                0;
            } else {
              fee = clinicPricing.consultation_fee || 0;
            }
            consultFee = fee;
            feeDescription =
              `${clinicPricing.clinic_name} - ${visitType === 'Follow-up' ? 'Follow-up' : visitType === 'Emergency' ? 'Emergency' : ''} Consultation`
                .replace('  ', ' ')
                .trim();
          }
        }

        // Generate billing order number
        const now = new Date();
        const yearStr = now.getFullYear().toString().slice(-2);
        const monthStr = (now.getMonth() + 1).toString().padStart(2, '0');
        const randomOrder = Math.floor(Math.random() * 100000)
          .toString()
          .padStart(5, '0');
        const orderNumber = `INV-${yearStr}${monthStr}-${randomOrder}`;

        // Create billing order — auto-verified for NHIS (status = 'Paid_NHIS')
        const grossAmount = consultFee;
        const { data: billingOrder, error: boError } = await supabase
          .from('billing_orders')
          .insert({
            order_number: orderNumber,
            patient_id: referralData.patient_id,
            visit_id: referralData.referral_encounter_id,
            encounter_id: referralData.referral_encounter_id,
            source_module: 'consultation',
            total_amount: grossAmount,
            discount_amount: 0,
            tax_amount: 0,
            net_amount: grossAmount,
            paid_amount: 0, // NHIS pays — patient pays nothing
            balance_amount: 0, // Zero balance for NHIS
            status: 'Paid_NHIS', // Auto-verified
            payment_method: 'NHIS',
            nhis_covered: true,
            nhis_percentage: 100,
            nhis_payable: grossAmount,
            patient_payable: 0,
            created_by: staffId,
          })
          .select('id')
          .single();

        if (boError) {
          log.error(
            '[NHIS Approval] Failed to create billing order:',
            boError,
          );
        } else if (billingOrder) {
          // Create billing item
          await supabase.from('billing_items').insert({
            billing_order_id: billingOrder.id,
            item_type: 'Consultation',
            item_id: referralData.referral_encounter_id,
            service_reference_id: referralData.referral_encounter_id,
            item_name: feeDescription,
            service_name: feeDescription,
            quantity: 1,
            unit_price: consultFee,
            unit_cost: consultFee,
            total_price: grossAmount,
            gross_amount: grossAmount,
            nhis_covered: true,
            nhis_percentage: 100,
            nhis_payable: grossAmount,
            patient_payable: 0,
            status: 'Paid', // Auto-verified
          });

          // Create receipt for audit trail
          const randomReceipt = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0');
          receiptNumber = `RCP-${yearStr}${monthStr}-${randomReceipt}`;

          await supabase.from('receipts').insert({
            receipt_number: receiptNumber,
            billing_order_id: billingOrder.id,
            patient_id: patientData?.patient_id || null, // VARCHAR display ID
            visit_id: encounterData?.visit_id || null, // VARCHAR display ID
            encounter_id: referralData.referral_encounter_id, // UUID
            amount_paid: 0, // NHIS consultation is free
            payment_method: 'NHIS',
            issued_by: staffDisplayId || null, // VARCHAR staff display ID
          });

          log.info(
            `[NHIS Approval] Auto-verified billing for NHIS consultation (Order: ${orderNumber}, Receipt: ${receiptNumber})`,
          );
        }
      } catch (billingError) {
        log.error(
          '[NHIS Approval] Failed to create auto-verified billing record:',
          billingError,
        );
        // Don't fail the approval — billing is for audit, not blocking
      }

      // =======================================================================
      // QUEUE ROUTING: Complete NHIS queue → Create Billing queue (completed) → Nursing
      // =======================================================================

      // Complete the NHIS Specialty Queue entry
      await supabase
        .from('queue')
        .update({
          status: 'Completed',
          completed_at: new Date().toISOString(),
        })
        .eq('visit_id', referralData.referral_encounter_id)
        .eq('location', 'NHIS Specialty Queue')
        .neq('status', 'Completed')
        .neq('status', 'Cancelled');

      // Create a Billing queue entry (immediately completed for audit trail)
      const billingNote = `NHIS Consultation auto-verified (FREE)${receiptNumber ? ` - Receipt: ${receiptNumber}` : ''} — proceeding to Nursing for vitals before ${specialtyTarget}`;
      try {
        const { data: billingQueueResult, error: billingQueueError } =
          await supabase.rpc('create_queue_ticket', {
            p_dept: 'Billing',
            p_patient_id: referralData.patient_id,
            p_visit_id: referralData.referral_encounter_id,
            p_encounter_id: referralData.referral_encounter_id,
            p_clinic_id: encounterData?.clinic_id || null,
            p_priority: 'Normal',
            p_notes: billingNote,
          });

        if (billingQueueError) {
          log.warn(
            '[NHIS Approval] Billing queue creation failed, using fallback:',
            billingQueueError,
          );
          const fallbackTicket = `Q-${Math.floor(Math.random() * 9000 + 1000)}`;
          const { data: fallbackQueue } = await supabase
            .from('queue')
            .insert({
              patient_id: referralData.patient_id,
              visit_id: referralData.referral_encounter_id,
              encounter_id: referralData.referral_encounter_id,
              clinic_id: encounterData?.clinic_id || null,
              ticket_number: fallbackTicket,
              location: 'Billing',
              priority: 'Normal',
              status: 'Waiting',
              notes: billingNote,
            })
            .select('id')
            .single();

          // Immediately complete it
          if (fallbackQueue) {
            await supabase
              .from('queue')
              .update({
                status: 'Completed',
                completed_at: new Date().toISOString(),
              })
              .eq('id', fallbackQueue.id);
          }
        } else if (
          billingQueueResult?.success &&
          billingQueueResult?.queue_id
        ) {
          // Immediately complete the billing queue entry (auto-verified)
          await supabase
            .from('queue')
            .update({
              status: 'Completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', billingQueueResult.queue_id);
          log.info(
            `[NHIS Approval] Billing queue entry created and auto-completed (ticket #${billingQueueResult.ticket_number})`,
          );
        }
      } catch (billingQueueErr) {
        log.error(
          '[NHIS Approval] Failed to create billing queue entry:',
          billingQueueErr,
        );
      }

      // Route to NURSING for vitals, tagged with specialty target
      const nursingNote = `NHIS Approved Internal Referral - Billing auto-verified (FREE)${receiptNumber ? ` (Receipt: ${receiptNumber})` : ''} — proceeding to Nursing for vitals before ${specialtyTarget} [SPECIALTY_NEXT:${specialtyTarget}]`;
      const { data: queueResult, error: queueError } = await supabase.rpc(
        'create_queue_ticket',
        {
          p_dept: 'Nursing',
          p_patient_id: referralData.patient_id,
          p_visit_id: referralData.referral_encounter_id,
          p_encounter_id: referralData.referral_encounter_id,
          p_clinic_id: encounterData?.clinic_id || null,
          p_priority: 'Normal',
          p_notes: nursingNote,
        },
      );

      if (queueError) {
        log.warn(
          '[NHIS Approval] Atomic queue creation failed, using fallback:',
          queueError,
        );
        const fallbackTicket = `Q-${Math.floor(Math.random() * 9000 + 1000)}`;
        await supabase.from('queue').insert({
          patient_id: referralData.patient_id,
          visit_id: referralData.referral_encounter_id,
          encounter_id: referralData.referral_encounter_id,
          clinic_id: encounterData?.clinic_id || null,
          ticket_number: fallbackTicket,
          location: 'Nursing',
          priority: 'Normal',
          status: 'Waiting',
          notes: nursingNote,
        });
        log.info(
          `[NHIS Approval] NHIS patient routed to Nursing with ticket #${fallbackTicket} (will proceed to ${specialtyTarget} after vitals)`,
        );
      } else if (queueResult?.success) {
        log.info(
          `[NHIS Approval] NHIS patient routed to Nursing queue with ticket #${queueResult.ticket_number} (will proceed to ${specialtyTarget} after vitals)`,
        );
      }

      // Update visit current_stage
      await supabase
        .from('visits')
        .update({
          current_stage: 'queue_waiting',
          updated_at: new Date().toISOString(),
        })
        .eq('id', referralData.referral_encounter_id);
    }
  } catch (routingError) {
    log.error(
      '[NHIS Approval] Failed to route patient to specialty queue after approval:',
      routingError,
    );
    // Don't fail the approval — the encounter exists and the referral is approved
  }
}

/**
 * Reject a specialty referral for NHIS
 */
export async function rejectSpecialtyReferral(
  referralId: string,
  rejectedBy: string, // This is auth.users.id
  reason: string,
): Promise<void> {
  // Get staff ID from user ID (rejected_by FK references staff.id, not auth.users.id)
  const { data: staffData } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', rejectedBy)
    .maybeSingle();

  const staffId = staffData?.id;
  if (!staffId) {
    throw new Error('Staff record not found for current user');
  }

  // Update clinical_request
  const { error: crError } = await supabase
    .from('clinical_requests')
    .update({
      nhis_approval_status: 'rejected',
      rejection_reason: reason,
      reviewed_by: staffId, // Use staff.id - clinical_requests uses reviewed_by for rejections
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', referralId);

  if (crError) {
    log.error('Error rejecting specialty referral:', crError);
    throw crError;
  }

  // Also update the nhis_approvals entry if it exists
  const { data: crData } = await supabase
    .from('clinical_requests')
    .select('nhis_authorization_id')
    .eq('id', referralId)
    .single();

  if (crData?.nhis_authorization_id) {
    await supabase
      .from('nhis_approvals')
      .update({
        status: 'rejected',
        rejected_by: staffId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', crData.nhis_authorization_id);
  }

  // Also sync the nhis_referral_queue entry if one was auto-created by the DB trigger
  await supabase
    .from('nhis_referral_queue')
    .update({
      status: 'rejected',
      processed_by: staffId,
      processed_at: new Date().toISOString(),
      processing_notes: reason || 'Rejected via Specialty Referrals tab',
      rejection_reason: reason,
    })
    .eq('clinical_request_id', referralId)
    .eq('request_type', 'internal_nhis_approval');
}

// =============================================================================
// Comprehensive NHIS Claims Report Data
// =============================================================================

/**
 * Comprehensive claims data for NHIS claims table with billing-style breakdown
 * Complete breakdown with all requested fields:
 * S/N, Date, Patient, Insurance Category, Payer/HMO, Encounter ID, Department/Category,
 * Service/Item, Qty, Total Cost, Coverage Type, NHIS %, Patient %, Patient Paid, NHIS Payable,
 * Auth Code, Auth Status, Invoice/Receipt, Payment Status, Referral Type, Referring Facility, Notes
 */
export interface NhisComprehensiveClaimItem {
  id: string;
  serialNumber: number;
  // Patient details
  patientId: string;
  patientName: string;
  emrNumber: string;

  // Insurance details
  insuranceType:
    | 'Personnel'
    | 'Security Services'
    | 'Civilian NHIS'
    | 'GIFSHIP'
    | 'Private HMO'
    | 'Other';
  schemeType: string | null;
  tariffGroup: string | null;

  // Payer / HMO details (from patient registration)
  payerName: string | null; // Payer / HMO Name
  hmoName: string | null;
  hmoId: string | null;

  // Referral details
  isReferral: boolean;
  referralType: 'External' | 'Internal' | null; // External (from outside) or Internal (between clinics)
  referralFacility: string | null; // Referring Facility name

  // Encounter details
  encounterId: string;
  encounterNumber: string | null; // Visit No
  encounterDate: string | null;

  // Service / Department details
  category:
    | 'lab'
    | 'radiology'
    | 'pharmacy'
    | 'procedure'
    | 'specialty'
    | 'consultation'
    | 'nursing'
    | 'admission'
    | 'physiotherapy';
  categoryLabel: string; // Human readable: Laboratory, Radiology, Pharmacy, Procedures, Specialty, Physiotherapy
  serviceName: string; // Service / Item Name
  serviceDescription: string | null;
  quantity: number;

  // Authorization details
  authorizationCode: string | null;
  hasAuthCode: boolean;
  authorizationStatus:
    | 'Not required'
    | 'Pending'
    | 'Approved'
    | 'Verified'
    | 'Provisional'
    | 'Rejected'
    | 'Expired';
  isProvisional: boolean;

  // Financial / Coverage
  totalAmount: number; // Total Cost (₦)
  coverageType: 'Full' | 'Partial' | 'Not Covered'; // Coverage Type
  coveragePercentage: number; // NHIS Coverage %
  patientPercentage: number; // Patient % (100 - coveragePercentage)
  nhisAmount: number; // NHIS Payable (₦)
  patientAmount: number; // Patient Paid (₦)

  // Invoice / Billing (MANDATORY - every NHIS encounter must have invoice)
  invoiceId: string | null;
  invoiceNumber: string | null; // Invoice No
  receiptId: string | null;
  receiptNumber: string | null; // Receipt No
  paymentStatus:
    | 'Paid'
    | 'Pending'
    | 'Reversed'
    | 'Refunded'
    | 'Partially Paid'
    | null;

  // Patient NHIS Number
  nhisNumber: string | null;

  // Timestamps - Service
  serviceDate: string;

  // AUDIT TIMESTAMPS (MANDATORY for compliance)
  createdAt: string | null;
  updatedAt: string | null;
  submittedAt: string | null;
  processedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  paidAt: string | null;

  // Audit actors
  createdBy: string | null;
  approvedBy: string | null;
  submittedBy: string | null;
  processedBy: string | null;
  rejectedBy: string | null;

  // Notes / Exceptions
  notes: string | null;
  exceptions: string | null;
  rejectionReason: string | null;

  // =========================================================================
  // PAYMENT PORTION CLASSIFICATION (NHIS Nigeria Model)
  // CAP = Capitation (prepaid monthly), FFS = Fee For Service, Private = out-of-pocket
  // =========================================================================
  portionType:
    | 'FFS_COVERED'
    | 'FFS_PARTIAL_PRIVATE'
    | 'PRIVATE_ONLY'
    | 'CAP_ONLY';
  capAmount: number; // Amount tracked under capitation (prepaid, not billed per visit)
  ffsAmount: number; // Fee-for-service amount NHIS pays per service rendered
  privateAmount: number; // Patient out-of-pocket (non-covered / exceeds limits)
  copayAmount: number; // Mandatory co-payment (policy-based %)
  copayPercentage: number; // Co-pay % from policy (e.g. 10%)
  netNhisPayable: number; // Net NHIS pays = ffsAmount - copayAmount

  // Claim workflow status
  claimStatus:
    | 'Draft'
    | 'Submitted'
    | 'Under_Review'
    | 'Queried'
    | 'Approved'
    | 'Rejected'
    | 'Paid';

  // Patient eligibility fields (for export)
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  planType: string | null;

  // Clinical data fields (for export)
  diagnosis: string | null;
  icdCode: string | null;
  clinicianName: string | null;
  department: string | null;
}

export interface NhisComprehensiveClaimsSummary {
  // Summary stats
  totalItems: number;
  totalAmount: number;
  totalNhisCovered: number;
  totalPatientPortion: number;
  totalVerifiedNhis: number;
  totalPendingNhis: number;
  // Payment portion totals (NHIS Nigeria Model)
  totalCapAmount: number;
  totalFfsAmount: number;
  totalPrivateAmount: number;
  totalCopayAmount: number;
  totalNetNhisPayable: number;
  // Breakdown by portion type
  byPortionType: {
    portionType: string;
    count: number;
    totalAmount: number;
  }[];
  // Breakdown by category
  byCategory: {
    category: string;
    categoryLabel: string;
    count: number;
    totalAmount: number;
    nhisCovered: number;
    patientPortion: number;
  }[];
  // Breakdown by insurance type
  byInsuranceType: {
    insuranceType: string;
    count: number;
    totalAmount: number;
    nhisCovered: number;
  }[];
  // Items with authorization codes
  itemsWithAuthCode: NhisComprehensiveClaimItem[];
  // Items without authorization codes (provisional or pending)
  itemsWithoutAuthCode: NhisComprehensiveClaimItem[];
  // All items
  allItems: NhisComprehensiveClaimItem[];
}

/**
 * Determine insurance type label from scheme/patient data
 * FIXED: Now properly uses patient.insurance_type field from registration
 */
function getInsuranceTypeLabel(
  schemeType: string | null,
  tariffGroup: string | null,
  patientType: string | null,
  patientInsuranceType?: string | null,
):
  | 'Personnel'
  | 'Security Services'
  | 'Civilian NHIS'
  | 'GIFSHIP'
  | 'Private HMO'
  | 'Other' {
  // First check patient's insurance_type from registration (most reliable source)
  const insuranceTypeLower = (patientInsuranceType || '')
    .toLowerCase()
    .replace(/_/g, ' ');

  // Military/DHML/Personnel — DHML is the default HMO for Military NHIS
  if (
    insuranceTypeLower.includes('dhml') ||
    insuranceTypeLower.includes('military nhis') ||
    insuranceTypeLower.includes('military_nhis') ||
    insuranceTypeLower.includes('personnel')
  ) {
    return 'Personnel';
  }

  // Security Services NHIS
  if (
    insuranceTypeLower.includes('security services nhis') ||
    insuranceTypeLower.includes('security_services_nhis')
  ) {
    return 'Security Services';
  }

  // Civilian NHIS
  if (
    insuranceTypeLower.includes('civilian nhis') ||
    insuranceTypeLower.includes('civilian_nhis')
  ) {
    return 'Civilian NHIS';
  }

  // GIFSHIP
  if (insuranceTypeLower.includes('gifship')) {
    return 'GIFSHIP';
  }

  // Private/HMO
  if (
    insuranceTypeLower.includes('private') ||
    insuranceTypeLower.includes('hmo')
  ) {
    return 'Private HMO';
  }

  // Fallback to scheme/tariff/patientType
  const scheme = (schemeType || '').toLowerCase();
  const tariff = (tariffGroup || '').toLowerCase();
  const pType = (patientType || '').toLowerCase();

  if (
    scheme.includes('personnel') ||
    tariff.includes('personnel') ||
    pType.includes('military') ||
    pType.includes('personnel') ||
    scheme.includes('dhml') ||
    tariff.includes('dhml')
  ) {
    return 'Personnel';
  }
  if (
    scheme.includes('gifship') ||
    tariff.includes('gifship') ||
    pType.includes('gifship')
  ) {
    return 'GIFSHIP';
  }
  if (
    scheme.includes('civilian') ||
    tariff.includes('civilian') ||
    pType.includes('civilian')
  ) {
    return 'Civilian NHIS';
  }
  if (
    scheme.includes('hmo') ||
    tariff.includes('hmo') ||
    pType.includes('hmo') ||
    pType.includes('private')
  ) {
    return 'Private HMO';
  }
  return 'Other';
}

/**
 * Extract authorization code from various sources
 */
function extractAuthorizationCode(
  reviewNotes: string | null,
  authStatus: string | null,
): string | null {
  if (!reviewNotes) return null;

  // Check for [AUTH CODE: xxx] pattern
  const authMatch = reviewNotes.match(/\[AUTH CODE:\s*([^\]]+)\]/i);
  if (authMatch) return authMatch[1].trim();

  // Check for [PROVISIONAL] - means no official code yet
  if (reviewNotes.includes('[PROVISIONAL]')) return null;

  return null;
}

/**
 * Fetch comprehensive NHIS claims data for reporting
 * This aggregates ALL NHIS-related billing and services with full financial breakdown
 * Includes: NHIS-approved requests, billing orders, invoices, and payments
 */
export async function fetchNhisComprehensiveClaims(
  filters: {
    startDate?: string;
    endDate?: string;
    insuranceType?: string;
    category?: string;
    hasAuthCode?: boolean;
  } = {},
): Promise<NhisComprehensiveClaimsSummary> {
  // =========================================================================
  // PAGINATION HELPER: Supabase limits results to 1,000 rows by default.
  // This helper fetches ALL matching rows regardless of count using pagination.
  // Without this, records beyond row 1,000 are silently dropped.
  // =========================================================================
  const BATCH_SIZE = 1000;
  async function fetchAllRows<T = any>(
    queryBuilder: any,
  ): Promise<{ data: T[]; error: any }> {
    const allData: T[] = [];
    let offset = 0;
    let hasMore = true;
    let lastError: any = null;

    while (hasMore) {
      const { data, error } = await queryBuilder.range(
        offset,
        offset + BATCH_SIZE - 1,
      );
      if (error) {
        lastError = error;
        break;
      }
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData.push(...data);
        if (data.length < BATCH_SIZE) {
          hasMore = false;
        } else {
          offset += BATCH_SIZE;
        }
      }
    }

    return { data: allData, error: lastError };
  }

  // Build date-filtered query helpers
  // Apply date filters at the DATABASE level (not in JS post-fetch) for:
  // 1. Performance: Only fetch records within the requested date range
  // 2. Completeness: Avoid hitting Supabase row limits by narrowing the result set
  const applyDateFilter = (query: any): any => {
    let q = query;
    if (filters.startDate) {
      q = q.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      // Add time component to include the entire end date
      q = q.lte('created_at', `${filters.endDate}T23:59:59.999Z`);
    }
    return q;
  };

  // Fetch all NHIS-related data from each module
  // IMPORTANT: Uses fetchAllRows() to bypass the 1,000 row default limit
  // and applyDateFilter() to filter at DB level for performance
  const [
    labResult,
    radiologyResult,
    pharmacyResult,
    procedureResult,
    specialtyResult,
    billingItemsResult,
    invoicesResult,
    paymentsResult,
    profilesResult,
    authorizationsResult,
    consultationsResult,
    admissionsResult,
    physioSessionsResult,
  ] = await Promise.all([
    // Lab requests with NHIS approval OR from NHIS patients
    // NOTE: PK is request_id (not id), FK to visits is via visit_id column
    fetchAllRows(
      applyDateFilter(
        supabase
          .from('lab_requests')
          .select(
            `
            request_id, test_id, patient_id, encounter_id, nhis_approval_status, diagnosis, clinical_notes, created_at, status,
            patient:patients!patient_id (id, emr_number, first_name, middle_name, surname, patient_type, insurance_type,
              payer_info, nhis_patient_source, referring_facility_name, nhis_number)
          `,
          )
          .or(
            'nhis_approval_status.eq.approved,nhis_approval_status.eq.not_required',
          ),
      ),
    ),

    // Radiology requests with NHIS approval OR from NHIS patients
    // NOTE: PK is request_id (not id), FK to visits is via visit_id column
    fetchAllRows(
      applyDateFilter(
        supabase
          .from('radiology_requests')
          .select(
            `
            request_id, imaging_type, body_part, clinical_indication, patient_id, encounter_id, nhis_approval_status, created_at, status,
            patient:patients!patient_id (id, emr_number, first_name, middle_name, surname, patient_type, insurance_type,
              payer_info, nhis_patient_source, referring_facility_name, nhis_number)
          `,
          )
          .or(
            'nhis_approval_status.eq.approved,nhis_approval_status.eq.not_required',
          ),
      ),
    ),

    // Prescriptions with NHIS approval OR from NHIS patients
    // NOTE: PK is prescription_id (not id), FK to visits is via visit_id column
    fetchAllRows(
      applyDateFilter(
        supabase
          .from('prescriptions')
          .select(
            `
            prescription_id, drug_name, quantity_prescribed, patient_id, encounter_id, nhis_approval_status, created_at, status,
            patient:patients!patient_id (id, emr_number, first_name, middle_name, surname, patient_type, insurance_type,
              payer_info, nhis_patient_source, referring_facility_name, nhis_number)
          `,
          )
          .or(
            'nhis_approval_status.eq.approved,nhis_approval_status.eq.not_required',
          ),
      ),
    ),

    // Procedure requests - use clinical_requests with Procedure/Surgery type
    fetchAllRows(
      applyDateFilter(
        supabase
          .from('clinical_requests')
          .select(
            `
            id, procedure_name, procedure_catalogue_id, request_type, clinical_reason, patient_id, encounter_id, nhis_approval_status, status, notes, created_at,
            patient:patients!patient_id (id, emr_number, first_name, middle_name, surname, patient_type, insurance_type,
              payer_info, nhis_patient_source, referring_facility_name, nhis_number),
            encounter:visits!clinical_requests_encounter_id_fkey (id, visit_id, encounter_number, encounter_date, payment_category),
            procedure_catalogue:procedure_catalogue!procedure_catalogue_id (id, name, base_price, nhis_price)
          `,
          )
          .in('request_type', ['Procedure', 'Surgery'])
          .or(
            'nhis_approval_status.eq.approved,nhis_approval_status.eq.not_required',
          ),
      ),
    ),

    // Specialty referrals with NHIS approval
    fetchAllRows(
      applyDateFilter(
        supabase
          .from('clinical_requests')
          .select(
            `
            id, specialty_module, clinical_reason, patient_id, encounter_id, nhis_approval_status, review_notes, approved_at, created_at,
            patient:patients!patient_id (id, emr_number, first_name, middle_name, surname, patient_type, insurance_type,
              payer_info, nhis_patient_source, referring_facility_name, nhis_number),
            encounter:visits!clinical_requests_encounter_id_fkey (id, visit_id, encounter_number, encounter_date, payment_category)
          `,
          )
          .eq('request_type', 'Referral')
          .or(
            'nhis_approval_status.eq.approved,nhis_approval_status.eq.not_required',
          ),
      ),
    ),

    // Billing items with NHIS coverage
    fetchAllRows(
      applyDateFilter(
        supabase
          .from('billing_items')
          .select(
            `
            id, billing_order_id, item_type, item_name, service_name, quantity, unit_price, unit_cost,
            total_price, gross_amount, nhis_covered, nhis_percentage, nhis_payable, patient_payable, status,
            service_reference_id,
            billing_order:billing_orders!billing_order_id (
              id, order_number, patient_id, encounter_id, payment_method, created_at, status, paid_amount, balance_amount,
              patient:patients!patient_id (id, emr_number, first_name, middle_name, surname, patient_type, insurance_type,
                payer_info, nhis_patient_source, referring_facility_name, nhis_number),
              encounter:visits!visit_id (id, visit_id, encounter_number, encounter_date, payment_category)
            )
          `,
          )
          .eq('nhis_covered', true),
      ),
    ),

    // Billing Orders (the actual invoice/billing records - replaces legacy invoices table)
    // These have order_number (acts as invoice number) and encounter_id linkage
    fetchAllRows(
      supabase.from('billing_orders').select(`
          id, order_number, patient_id, encounter_id, status, total_amount, paid_amount, balance_amount, created_at
        `),
    ),

    // Receipts (linked to billing_orders - replaces legacy payments table)
    // These have receipt_number and billing_order_id linkage
    fetchAllRows(
      supabase.from('receipts').select(`
          receipt_id, receipt_number, billing_order_id, patient_id, encounter_id, amount_paid, payment_method, issue_date, created_at
        `),
    ),

    // NHIS profiles for additional context (lookup table - fetch all)
    fetchAllRows(
      supabase
        .from('nhis_profiles')
        .select(
          'patient_id, scheme_type, tariff_group, provider_name, patient_origin, referring_facility_name, enrollee_id',
        ),
    ),

    // NHIS authorizations for auth codes (lookup table - fetch all)
    fetchAllRows(
      supabase
        .from('nhis_authorizations')
        .select(
          'id, patient_id, auth_code, auth_type, status, referral_code, referral_source, start_date, expiry_date',
        ),
    ),

    // Consultations - NHIS billable consultation records
    // NOTE: consultations.patient_id is varchar(50), not uuid FK to patients
    // Patient info must be resolved via encounter → visits → patients
    fetchAllRows(
      applyDateFilter(
        supabase
          .from('consultations')
          .select(
            `
            consultation_id, patient_id, encounter_id, consultation_fee, nhis_consultation_fee,
            nhis_approval_status, diagnosis_text, diagnosis, consultation_date, created_at, clinic_id, doctor_id,
            encounter:visits!consultations_encounter_id_fkey (id, visit_id, encounter_number, encounter_date, payment_category,
              patient:patients!visits_patient_id_fkey (id, emr_number, first_name, middle_name, surname, patient_type, insurance_type,
                payer_info, nhis_patient_source, referring_facility_name, nhis_number))
          `,
          )
          .or(
            'nhis_approval_status.eq.approved,nhis_approval_status.eq.not_required,nhis_approval_status.eq.pending',
          ),
      ),
    ),

    // Admissions - NHIS billable inpatient stays
    fetchAllRows(
      applyDateFilter(
        supabase
          .from('admissions')
          .select(
            `
            id, admission_number, patient_id, encounter_id, admission_date, actual_discharge_date,
            admission_type, admitting_diagnosis, nhis_approval_status, insurance_verified,
            pre_authorization_number, daily_bed_rate, nhis_daily_bed_rate, total_bed_charges,
            nhis_total_bed_charges, estimated_cost, admission_status, created_at,
            patient:patients!admissions_patient_id_fkey (id, emr_number, first_name, middle_name, surname, patient_type, insurance_type,
              payer_info, nhis_patient_source, referring_facility_name, nhis_number),
            encounter:visits!admissions_encounter_id_fkey (id, visit_id, encounter_number, encounter_date, payment_category)
          `,
          )
          .or(
            'nhis_approval_status.eq.approved,nhis_approval_status.eq.not_required,nhis_approval_status.eq.pending',
          ),
      ),
    ),

    // Physiotherapy sessions - NHIS billable physio treatment sessions
    // Sessions are linked to physio_plans which carry nhis_approval_status
    fetchAllRows(
      applyDateFilter(
        supabase
          .from('physio_sessions')
          .select(
            `
            id, plan_id, session_number, session_type, status, session_date, created_at,
            soap_subjective, soap_assessment, therapist_notes,
            patient:patients!physio_sessions_patient_id_fkey (id, emr_number, first_name, middle_name, surname, patient_type, insurance_type,
              payer_info, nhis_patient_source, referring_facility_name, nhis_number),
            plan:physio_plans!physio_sessions_plan_id_fkey (id, encounter_id, nhis_approval_status, nhis_authorization_code, is_nhis_plan,
              plan_name, sessions_approved)
          `,
          )
          .eq('status', 'completed'),
      ),
    ),
  ]);

  // Create lookup maps
  const profileMap = new Map<string, any>();
  for (const profile of profilesResult.data || []) {
    profileMap.set(profile.patient_id, profile);
  }

  const authorizationMap = new Map<string, any>();
  for (const auth of authorizationsResult.data || []) {
    if (auth.status === 'active') {
      authorizationMap.set(auth.patient_id, auth);
    }
  }

  // =============================================================================
  // INVOICE & RECEIPT LOOKUP MAPS (Data Integrity Enforced)
  // =============================================================================
  // Strategy: Use billing_items.service_reference_id as the PRIMARY key to match
  // each clinical record to its EXACT billing_order (invoice) and receipt.
  // This ensures every record gets its own correct invoice/receipt, not a random
  // one from the same encounter or patient.
  //
  // Lookup chain: service_reference_id → billing_item → billing_order_id → billing_orders (invoice)
  //               billing_order_id → receipts (receipt)
  // =============================================================================

  // Map 1: service_reference_id → invoice info (from billing_items + joined billing_order)
  // This is the most precise lookup — each clinical record ID maps to exactly one billing order
  const invoiceByServiceRef = new Map<
    string,
    {
      invoiceId: string;
      invoiceNumber: string;
      encounterId: string | null;
      status: string;
      totalAmount: number;
      paidAmount: number;
      balance: number;
      createdAt: string;
    }
  >();
  for (const item of billingItemsResult.data || []) {
    const serviceRefId = item.service_reference_id as string | null;
    const billingOrder = item.billing_order as any;
    if (!serviceRefId || !billingOrder) continue;
    // Only store the first (or overwrite with same data — each service_ref maps to one BO)
    if (!invoiceByServiceRef.has(serviceRefId)) {
      invoiceByServiceRef.set(serviceRefId, {
        invoiceId: billingOrder.id,
        invoiceNumber: billingOrder.order_number,
        encounterId: billingOrder.encounter_id || null,
        status: billingOrder.status || 'Pending',
        totalAmount: billingOrder.total_amount || 0,
        paidAmount: billingOrder.paid_amount || 0,
        balance: billingOrder.balance_amount || 0,
        createdAt: billingOrder.created_at,
      });
    }
  }

  // Map 2: encounter_id → billing orders (fallback for records without billing_item match)
  const invoiceByEncounterMap = new Map<string, any[]>();
  for (const bo of invoicesResult.data || []) {
    const normalized = {
      invoice_id: bo.id,
      invoice_number: bo.order_number,
      encounter_id: bo.encounter_id,
      status: bo.status,
      total_amount: bo.total_amount,
      amount_paid: bo.paid_amount || 0,
      balance: bo.balance_amount || 0,
      created_at: bo.created_at,
    };
    if (normalized.encounter_id) {
      if (!invoiceByEncounterMap.has(normalized.encounter_id)) {
        invoiceByEncounterMap.set(normalized.encounter_id, []);
      }
      invoiceByEncounterMap.get(normalized.encounter_id)!.push(normalized);
    }
  }

  // Map 3: billing_order_id → receipts (for receipt lookup after invoice is found)
  const receiptByBillingOrderMap = new Map<string, any[]>();
  // Map 4: encounter_id → receipts (direct lookup when billing_order match is unavailable)
  const receiptByEncounterMap = new Map<string, any[]>();
  for (const rcpt of paymentsResult.data || []) {
    const normalizedReceipt = {
      receipt_id: rcpt.receipt_id,
      receipt_number: rcpt.receipt_number,
      billing_order_id: rcpt.billing_order_id,
      encounter_id: rcpt.encounter_id,
      amount_paid: rcpt.amount_paid,
      payment_method: rcpt.payment_method,
      payment_date: rcpt.issue_date || rcpt.created_at,
    };
    // Index by billing_order_id
    if (rcpt.billing_order_id) {
      if (!receiptByBillingOrderMap.has(rcpt.billing_order_id)) {
        receiptByBillingOrderMap.set(rcpt.billing_order_id, []);
      }
      receiptByBillingOrderMap
        .get(rcpt.billing_order_id)!
        .push(normalizedReceipt);
    }
    // Index by encounter_id
    if (rcpt.encounter_id) {
      if (!receiptByEncounterMap.has(rcpt.encounter_id)) {
        receiptByEncounterMap.set(rcpt.encounter_id, []);
      }
      receiptByEncounterMap.get(rcpt.encounter_id)!.push(normalizedReceipt);
    }
  }

  // Aggregate billing_items by service_reference_id (single source of truth for pricing)
  type BillingAggregate = {
    serviceRefId: string;
    totalAmount: number;
    nhisAmount: number;
    patientAmount: number;
    coveragePercentage: number;
    itemType: string | null;
    serviceName: string | null;
    patient: any;
    encounter: any;
    createdAt: string | null;
    paymentStatus: 'Paid' | 'Partially Paid' | 'Pending' | null;
  };

  const billingByServiceRef = new Map<string, BillingAggregate>();
  const billingItemsWithoutRef: any[] = [];

  for (const item of billingItemsResult.data || []) {
    const serviceRefId = item.service_reference_id as string | null;
    if (!serviceRefId) {
      billingItemsWithoutRef.push(item);
      continue;
    }

    const billingOrder = item.billing_order as any;
    let paymentStatus: 'Paid' | 'Partially Paid' | 'Pending' | null = null;
    if (billingOrder) {
      if (
        billingOrder.status === 'Paid' ||
        (billingOrder.balance_amount ?? 0) <= 0
      ) {
        paymentStatus = 'Paid';
      } else if ((billingOrder.paid_amount ?? 0) > 0) {
        paymentStatus = 'Partially Paid';
      } else {
        paymentStatus = 'Pending';
      }
    }

    const totalAmount = item.gross_amount || item.total_price || 0;
    const nhisAmount = item.nhis_payable || 0;
    const patientAmount =
      item.patient_payable || Math.max(totalAmount - nhisAmount, 0);

    if (!billingByServiceRef.has(serviceRefId)) {
      billingByServiceRef.set(serviceRefId, {
        serviceRefId,
        totalAmount: 0,
        nhisAmount: 0,
        patientAmount: 0,
        coveragePercentage: 0,
        itemType: item.item_type || null,
        serviceName: item.service_name || item.item_name || null,
        patient: billingOrder?.patient || null,
        encounter: billingOrder?.encounter || null,
        createdAt: billingOrder?.created_at || null,
        paymentStatus,
      });
    }

    const agg = billingByServiceRef.get(serviceRefId)!;
    agg.totalAmount += totalAmount;
    agg.nhisAmount += nhisAmount;
    agg.patientAmount += patientAmount;
    if (!agg.serviceName && (item.service_name || item.item_name)) {
      agg.serviceName = item.service_name || item.item_name || null;
    }
    if (!agg.paymentStatus && paymentStatus) {
      agg.paymentStatus = paymentStatus;
    }
  }

  for (const agg of billingByServiceRef.values()) {
    agg.coveragePercentage =
      agg.totalAmount > 0
        ? Math.round((agg.nhisAmount / agg.totalAmount) * 10000) / 100
        : 0;
  }

  let serialNumber = 0;
  const allItems: NhisComprehensiveClaimItem[] = [];

  // Helper to get invoice/receipt info with data integrity enforcement
  // Priority: 1) service_reference_id (exact match), 2) encounter_id (fallback)
  // Receipt: matched via billing_order_id (guaranteed correct linkage)
  const getInvoiceInfo = (
    encounterId: string,
    patientId?: string,
    serviceRefId?: string,
  ): {
    invoiceId: string | null;
    invoiceNumber: string | null;
    receiptId: string | null;
    receiptNumber: string | null;
    paymentStatus: string | null;
    paidAt: string | null;
  } => {
    // === PRIORITY 1: Exact service-level match via billing_items.service_reference_id ===
    if (serviceRefId) {
      const exactInvoice = invoiceByServiceRef.get(serviceRefId);
      if (exactInvoice) {
        // Find receipt for this specific billing order
        const receipts =
          receiptByBillingOrderMap.get(exactInvoice.invoiceId) || [];
        const latestReceipt =
          receipts.length > 0
            ? receipts.sort(
                (a: any, b: any) =>
                  new Date(b.payment_date).getTime() -
                  new Date(a.payment_date).getTime(),
              )[0]
            : null;

        const status = (exactInvoice.status || '').toLowerCase();
        let paymentStatus: string | null = 'Pending';
        if (
          status === 'paid' ||
          status === 'paid_nhis' ||
          exactInvoice.balance <= 0
        ) {
          paymentStatus = 'Paid';
        } else if (exactInvoice.paidAmount > 0) {
          paymentStatus = 'Partially Paid';
        }

        return {
          invoiceId: exactInvoice.invoiceId,
          invoiceNumber: exactInvoice.invoiceNumber,
          receiptId: latestReceipt?.receipt_id || null,
          receiptNumber: latestReceipt?.receipt_number || null,
          paymentStatus,
          paidAt: latestReceipt?.payment_date || null,
        };
      }
    }

    // === PRIORITY 2: Encounter-level match (picks first billing order for the encounter) ===
    if (encounterId) {
      const encounterOrders = invoiceByEncounterMap.get(encounterId) || [];
      if (encounterOrders.length > 0) {
        // Pick the most recent billing order for this encounter
        const latestOrder = encounterOrders.sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0];

        const receipts =
          receiptByBillingOrderMap.get(latestOrder.invoice_id) || [];
        const latestReceipt =
          receipts.length > 0
            ? receipts.sort(
                (a: any, b: any) =>
                  new Date(b.payment_date).getTime() -
                  new Date(a.payment_date).getTime(),
              )[0]
            : null;

        const status = (latestOrder.status || '').toLowerCase();
        let paymentStatus: string | null = 'Pending';
        if (
          status === 'paid' ||
          status === 'paid_nhis' ||
          latestOrder.balance <= 0
        ) {
          paymentStatus = 'Paid';
        } else if (latestOrder.amount_paid > 0) {
          paymentStatus = 'Partially Paid';
        }

        return {
          invoiceId: latestOrder.invoice_id,
          invoiceNumber: latestOrder.invoice_number,
          receiptId: latestReceipt?.receipt_id || null,
          receiptNumber: latestReceipt?.receipt_number || null,
          paymentStatus,
          paidAt: latestReceipt?.payment_date || null,
        };
      }

      // === PRIORITY 3: Direct receipt lookup by encounter_id (if no billing order found) ===
      const encounterReceipts = receiptByEncounterMap.get(encounterId) || [];
      if (encounterReceipts.length > 0) {
        const latestReceipt = encounterReceipts.sort(
          (a: any, b: any) =>
            new Date(b.payment_date).getTime() -
            new Date(a.payment_date).getTime(),
        )[0];
        return {
          invoiceId: null,
          invoiceNumber: null,
          receiptId: latestReceipt.receipt_id,
          receiptNumber: latestReceipt.receipt_number,
          paymentStatus: 'Paid',
          paidAt: latestReceipt.payment_date,
        };
      }
    }

    return {
      invoiceId: null,
      invoiceNumber: null,
      receiptId: null,
      receiptNumber: null,
      paymentStatus: null,
      paidAt: null,
    };
  };

  // Helper to get auth code from authorization record
  const getAuthCodeFromAuthorization = (patientId: string): string | null => {
    const auth = authorizationMap.get(patientId);
    return auth?.auth_code || auth?.referral_code || null;
  };

  // =============================================================================
  // ENCOUNTER → DIAGNOSIS LOOKUP MAP
  // =============================================================================
  // Build a map from encounter_id to the consultation diagnosis for that encounter.
  // This ensures lab, radiology, pharmacy, procedure records inherit the correct
  // diagnosis from the consultation associated with the same encounter, rather than
  // showing service descriptions (body parts, drug names, etc.) as the diagnosis.
  // =============================================================================
  const diagnosisByEncounterMap = new Map<
    string,
    {
      diagnosis: string | null;
      icdCode: string | null;
      clinicianName: string | null;
    }
  >();
  for (const c of consultationsResult.data || []) {
    if (!c.encounter_id) continue;
    // diagnosis_text is the free-text diagnosis, diagnosis[] is the coded array
    const diagText =
      c.diagnosis_text ||
      (Array.isArray(c.diagnosis)
        ? c.diagnosis.filter(Boolean).join('; ')
        : null);
    if (diagText && !diagnosisByEncounterMap.has(c.encounter_id)) {
      diagnosisByEncounterMap.set(c.encounter_id, {
        diagnosis: diagText,
        icdCode: null, // ICD codes not stored in consultations table currently
        clinicianName: c.doctor_id || null,
      });
    }
  }

  // Helper to create a claim item
  const createClaimItem = (
    record: any,
    category:
      | 'lab'
      | 'radiology'
      | 'pharmacy'
      | 'procedure'
      | 'specialty'
      | 'consultation'
      | 'nursing'
      | 'admission'
      | 'physiotherapy',
    serviceName: string,
    amount: number,
    description: string | null = null,
    overrides: Partial<NhisComprehensiveClaimItem> = {},
  ): NhisComprehensiveClaimItem => {
    serialNumber++;
    const profile = profileMap.get(record.patient_id);
    const schemeType = profile?.scheme_type || null;
    const tariffGroup = profile?.tariff_group || null;
    const patientType = record.patient?.patient_type || null;
    // Get the actual insurance_type from patient registration (most reliable source)
    const patientInsuranceType = record.patient?.insurance_type || null;

    // FIXED: Pass patientInsuranceType to helper functions for accurate coverage calculation
    const insuranceType = getInsuranceTypeLabel(
      schemeType,
      tariffGroup,
      patientType,
      patientInsuranceType,
    );

    // Get auth code from review notes or authorization table
    const authCodeFromNotes = extractAuthorizationCode(
      record.review_notes,
      record.nhis_approval_status,
    );
    const authCodeFromAuth = getAuthCodeFromAuthorization(record.patient_id);
    const authCode =
      authCodeFromNotes ||
      authCodeFromAuth ||
      overrides.authorizationCode ||
      null;

    const isProvisional = (record.review_notes || '').includes('[PROVISIONAL]');

    // Calculate NHIS and patient portions from billing-derived prices
    const nhisCovered = overrides.nhisAmount ?? 0;
    const patientPortion =
      overrides.patientAmount ?? Math.max(amount - nhisCovered, 0);
    const coveragePercentage =
      overrides.coveragePercentage ??
      (amount > 0 ? Math.round((nhisCovered / amount) * 10000) / 100 : 0);
    const patientPercentage = 100 - coveragePercentage;

    // Determine coverage type
    let coverageType: 'Full' | 'Partial' | 'Not Covered' = 'Full';
    if (coveragePercentage === 0) {
      coverageType = 'Not Covered';
    } else if (coveragePercentage < 100) {
      coverageType = 'Partial';
    }

    // Determine authorization status label
    let authorizationStatus:
      | 'Not required'
      | 'Pending'
      | 'Approved'
      | 'Verified'
      | 'Provisional'
      | 'Rejected'
      | 'Expired' = 'Approved';
    if (isProvisional) {
      authorizationStatus = 'Provisional';
    } else if (authCode) {
      authorizationStatus = 'Verified';
    } else if (record.nhis_approval_status === 'not_required') {
      authorizationStatus = 'Not required';
    } else if (record.nhis_approval_status === 'pending') {
      authorizationStatus = 'Pending';
    } else if (record.nhis_approval_status === 'rejected') {
      authorizationStatus = 'Rejected';
    } else if (record.nhis_approval_status === 'expired') {
      authorizationStatus = 'Expired';
    }

    // Determine referral type
    const isReferral =
      profile?.patient_origin === 'referred' ||
      record.patient?.nhis_patient_source === 'referral' ||
      record.patient?.nhis_patient_source === 'Referral';
    let referralType: 'External' | 'Internal' | null = null;
    if (isReferral) {
      referralType =
        profile?.referring_facility_name ||
        record.patient?.referring_facility_name
          ? 'External'
          : 'Internal';
    }

    // Category label
    const categoryLabels: Record<string, string> = {
      lab: 'Laboratory',
      radiology: 'Radiology',
      pharmacy: 'Pharmacy',
      procedure: 'Procedures',
      specialty: 'Specialty',
      consultation: 'Consultation',
      nursing: 'Nursing',
      admission: 'Admission/Inpatient',
      physiotherapy: 'Physiotherapy',
    };

    // Extract notes/exceptions
    const notes =
      record.review_notes
        ?.replace(/\[AUTH CODE:[^\]]+\]/gi, '')
        .replace(/\[PROVISIONAL\]/gi, '')
        .trim() || null;

    // Get invoice/payment info with data integrity: service_reference_id → exact billing order
    const invoiceInfo = getInvoiceInfo(
      record.encounter_id,
      record.patient_id,
      record.id,
    );

    // =========================================================================
    // PAYMENT PORTION CLASSIFICATION (NHIA Standard Practice)
    // =========================================================================
    // FFS_COVERED         — Fully covered FFS (standard 90/10 split)
    // FFS_PARTIAL_PRIVATE — Partially covered FFS + private excess
    // PRIVATE_ONLY        — Not covered by NHIS at all
    // CAP_ONLY            — Capitation-based (prepaid monthly)
    //
    // STRICT RULES:
    //   - CAP_ONLY: FFS/co-pay/private must all be 0
    //   - FFS_*:    CAP amount must be 0
    //   - Co-pay and Private are SEPARATE fields, never merged
    //   - net_nhis_payable = nhis_covered_amount = totalTariff - copay - private
    // =========================================================================
    const defaultCopayPercent = 10; // Default 10% co-pay on FFS items

    let portionType:
      | 'FFS_COVERED'
      | 'FFS_PARTIAL_PRIVATE'
      | 'PRIVATE_ONLY'
      | 'CAP_ONLY' = 'FFS_COVERED';
    let capAmount = 0;
    let ffsAmount = 0;
    let privateAmount = 0;
    let copayAmount = 0;
    const copayPercentage = defaultCopayPercent;

    if (coverageType === 'Not Covered') {
      // ── PRIVATE_ONLY ── Service entirely out-of-pocket, NHIS does not cover
      portionType = 'PRIVATE_ONLY';
      privateAmount = amount;
      // PRIVATE_ONLY: all NHIS fields must be 0
      // capAmount = 0, ffsAmount = 0, copayAmount = 0 (already defaults)
    } else if (
      category === 'consultation' ||
      (category === 'pharmacy' && coveragePercentage === 100)
    ) {
      // ── CAP_ONLY ── Capitation: consultation fees + fully-covered basic drugs
      // Prepaid monthly — tracked but NOT billed per visit
      portionType = 'CAP_ONLY';
      capAmount = amount;
      // CAP_ONLY: FFS/co-pay/private must all be 0 (already defaults)
    } else if (coverageType === 'Partial') {
      // ── FFS_PARTIAL_PRIVATE ── Partially covered: FFS portion + private excess
      portionType = 'FFS_PARTIAL_PRIVATE';
      // The NHIS-covered portion is the FFS amount
      ffsAmount = nhisCovered;
      // The uncovered excess is private (out-of-pocket)
      privateAmount = patientPortion;
      // Co-pay applies to the FFS (NHIS-covered) portion only
      copayAmount = Math.round(ffsAmount * (copayPercentage / 100) * 100) / 100;
      // CAP must be 0 for FFS items (already default)
    } else {
      // ── FFS_COVERED ── Fully covered non-consultation FFS services
      // (lab, imaging, procedures, specialty, non-basic drugs)
      portionType = 'FFS_COVERED';
      ffsAmount = amount;
      copayAmount = Math.round(ffsAmount * (copayPercentage / 100) * 100) / 100;
      // CAP must be 0 for FFS items (already default)
    }

    // Net NHIS Payable = FFS amount minus co-pay (what NHIS actually reimburses)
    const netNhisPayable = Math.max(ffsAmount - copayAmount, 0);

    // =========================================================================
    // COVERAGE % CONSISTENCY VALIDATION
    // Ensure coveragePercentage aligns with nhis_covered / total_tariff
    // =========================================================================
    const computedCoveragePercent =
      amount > 0 ? Math.round((nhisCovered / amount) * 10000) / 100 : 0;
    // Overwrite coveragePercentage with computed value to guarantee consistency
    const validatedCoveragePercentage =
      portionType === 'PRIVATE_ONLY'
        ? 0
        : portionType === 'FFS_COVERED'
          ? computedCoveragePercent || 90
          : computedCoveragePercent;

    // =========================================================================
    // FINANCIAL RECONCILIATION ASSERTION (development aid)
    // total_tariff_amount = nhis_covered_amount + co_pay_amount + private_amount
    // =========================================================================
    const reconciliationSum = nhisCovered + copayAmount + privateAmount;
    const reconciliationDiff = Math.abs(amount - reconciliationSum);
    const hasReconciliationError =
      reconciliationDiff > 0.02 && portionType !== 'CAP_ONLY';
    // NOTE: CAP_ONLY items don't follow this rule because capAmount IS the total

    // Determine claim workflow status from payment/authorization state
    // =========================================================================
    // AUTHORIZATION WORKFLOW VALIDATION (NHIA Standard)
    // Draft → Submitted → Under_Review → Approved → Paid
    // If authorization is required AND authorization_code is NULL:
    //   claim_status CANNOT be "Paid"
    // =========================================================================
    const authorizationRequired =
      portionType === 'FFS_COVERED' || portionType === 'FFS_PARTIAL_PRIVATE';
    let claimStatus:
      | 'Draft'
      | 'Submitted'
      | 'Under_Review'
      | 'Queried'
      | 'Approved'
      | 'Rejected'
      | 'Paid' = 'Draft';
    if (invoiceInfo.paymentStatus === 'Paid') {
      // ENFORCEMENT: If auth is required but no auth code, cap status at Approved (not Paid)
      if (authorizationRequired && !authCode) {
        claimStatus = 'Approved'; // Payment received but auth missing — flag for review
      } else {
        claimStatus = 'Paid';
      }
    } else if (authorizationStatus === 'Verified') {
      claimStatus = 'Approved';
    } else if (authorizationStatus === 'Approved') {
      claimStatus = 'Submitted';
    } else if (
      authorizationStatus === 'Pending' ||
      authorizationStatus === 'Provisional'
    ) {
      claimStatus = 'Under_Review';
    } else if (authorizationStatus === 'Rejected') {
      claimStatus = 'Rejected';
    }

    return {
      id: record.id,
      serialNumber,
      patientId: record.patient_id,
      patientName: [
        record.patient?.first_name,
        record.patient?.middle_name,
        record.patient?.surname,
      ]
        .filter(Boolean)
        .join(' '),
      emrNumber: record.patient?.emr_number || '',
      insuranceType,
      schemeType,
      tariffGroup,
      payerName:
        record.patient?.payer_info?.scheme || profile?.provider_name || null,
      hmoName:
        record.patient?.payer_info?.scheme || profile?.provider_name || null,
      hmoId:
        profile?.enrollee_id ||
        record.patient?.payer_info?.enrolee_id ||
        record.patient?.nhis_number ||
        null,
      isReferral,
      referralType,
      referralFacility:
        profile?.referring_facility_name ||
        record.patient?.referring_facility_name ||
        null,
      encounterId: record.encounter_id,
      encounterNumber:
        record.encounter?.encounter_number ||
        record.encounter?.visit_id ||
        null,
      encounterDate: record.encounter?.encounter_date || null,
      category,
      categoryLabel: categoryLabels[category] || category,
      serviceName,
      serviceDescription: description,
      quantity: record.quantity || 1,
      authorizationCode: authCode,
      hasAuthCode: !!authCode,
      authorizationStatus: overrides.authorizationStatus || authorizationStatus,
      isProvisional,
      totalAmount: amount,
      coverageType,
      coveragePercentage: validatedCoveragePercentage,
      patientPercentage: 100 - validatedCoveragePercentage,
      nhisAmount: nhisCovered,
      patientAmount: patientPortion,
      // Invoice / Receipt (every NHIS encounter must have an invoice)
      invoiceId: overrides.invoiceId || invoiceInfo.invoiceId || null,
      invoiceNumber: overrides.invoiceNumber || invoiceInfo.invoiceNumber,
      receiptId: overrides.receiptId || invoiceInfo.receiptId || null,
      receiptNumber: overrides.receiptNumber || invoiceInfo.receiptNumber,
      paymentStatus: (overrides.paymentStatus ||
        invoiceInfo.paymentStatus) as any,
      // Patient NHIS Number
      nhisNumber: record.patient?.nhis_number || profile?.enrollee_id || null,
      // Service Date
      serviceDate: record.created_at,
      // AUDIT TIMESTAMPS (MANDATORY for compliance)
      createdAt: record.created_at || null,
      updatedAt: record.updated_at || null,
      submittedAt: record.submitted_at || null,
      processedAt: record.processed_at || null,
      approvedAt: record.approved_at || null,
      rejectedAt: record.rejected_at || null,
      paidAt: invoiceInfo.paidAt || null,
      // Audit actors
      createdBy: record.created_by_staff
        ? `${record.created_by_staff.first_name} ${record.created_by_staff.last_name}`
        : null,
      approvedBy: record.approved_by_staff
        ? `${record.approved_by_staff.first_name} ${record.approved_by_staff.last_name}`
        : null,
      submittedBy: record.submitted_by_staff
        ? `${record.submitted_by_staff.first_name} ${record.submitted_by_staff.last_name}`
        : null,
      processedBy: record.processed_by_staff
        ? `${record.processed_by_staff.first_name} ${record.processed_by_staff.last_name}`
        : null,
      rejectedBy: record.rejected_by_staff
        ? `${record.rejected_by_staff.first_name} ${record.rejected_by_staff.last_name}`
        : null,
      // Notes / Exceptions — include reconciliation warnings
      notes: hasReconciliationError
        ? `${notes ? `${notes} | ` : ''}[RECONCILIATION WARNING: Total(${amount}) != NHIS(${nhisCovered}) + CoPay(${copayAmount}) + Private(${privateAmount}) diff=${reconciliationDiff.toFixed(2)}]`
        : notes,
      exceptions: hasReconciliationError
        ? `Reconciliation mismatch: ₦${reconciliationDiff.toFixed(2)}`
        : null,
      rejectionReason: record.rejection_reason || null,
      // Payment Portion Classification (NHIA Standard: FFS_COVERED/FFS_PARTIAL_PRIVATE/PRIVATE_ONLY/CAP_ONLY)
      portionType,
      capAmount,
      ffsAmount,
      privateAmount,
      copayAmount,
      copayPercentage,
      netNhisPayable,
      // Claim workflow status
      claimStatus,
      // Patient eligibility fields
      dateOfBirth: record.patient?.date_of_birth || null,
      gender: record.patient?.gender || null,
      phone: record.patient?.contact_phone || null,
      planType: schemeType || insuranceType,
      // Clinical data fields — priority order:
      // 1. Record's own diagnosis fields (lab diagnosis, consultation diagnosis_text, admitting_diagnosis)
      // 2. Encounter-level consultation diagnosis (looked up from diagnosisByEncounterMap)
      // 3. null (NEVER use service description as diagnosis — that shows drug names, body parts, etc.)
      diagnosis:
        record.diagnosis ||
        record.diagnosis_text ||
        record.clinical_reason ||
        record.admitting_diagnosis ||
        (record.encounter_id
          ? diagnosisByEncounterMap.get(record.encounter_id)?.diagnosis
          : null) ||
        null,
      icdCode:
        (record.encounter_id
          ? diagnosisByEncounterMap.get(record.encounter_id)?.icdCode
          : null) || null,
      clinicianName:
        (record.encounter_id
          ? diagnosisByEncounterMap.get(record.encounter_id)?.clinicianName
          : null) || null,
      department: record.specialty_module || categoryLabels[category] || null,
    };
  };

  const usedServiceRefs = new Set<string>();

  const getBillingAggregate = (
    serviceRefId: string | null | undefined,
  ): BillingAggregate | null => {
    if (!serviceRefId) return null;
    const agg = billingByServiceRef.get(serviceRefId);
    if (!agg) return null;
    usedServiceRefs.add(serviceRefId);
    return agg;
  };

  const getCategoryFromItemType = (
    itemType: string | null,
  ):
    | 'lab'
    | 'radiology'
    | 'pharmacy'
    | 'procedure'
    | 'specialty'
    | 'consultation'
    | 'nursing'
    | 'admission'
    | 'physiotherapy' => {
    const type = (itemType || '').toLowerCase();
    if (type.includes('lab')) return 'lab';
    if (type.includes('radiology') || type.includes('imaging'))
      return 'radiology';
    if (type.includes('pharm') || type.includes('drug')) return 'pharmacy';
    if (type.includes('procedure') || type.includes('surgery'))
      return 'procedure';
    if (type.includes('physio')) return 'physiotherapy';
    if (type.includes('specialty')) return 'specialty';
    if (
      type.includes('admission') ||
      type.includes('bed') ||
      type.includes('ward')
    )
      return 'admission';
    if (type.includes('consultation')) return 'consultation';
    return 'consultation';
  };

  // Process lab results
  // NOTE: lab_requests PK is request_id, not id
  for (const r of labResult.data || []) {
    const billing = getBillingAggregate(r.request_id);
    if (!billing) continue;
    allItems.push(
      createClaimItem(
        {
          ...r,
          id: r.request_id,
          patient: r.patient || billing.patient,
          encounter: billing.encounter,
          created_at: r.created_at || billing.createdAt,
          quantity: r.quantity || 1,
        },
        'lab',
        billing.serviceName || r.test_id || 'Lab Test',
        billing.totalAmount,
        r.diagnosis || null,
        {
          coveragePercentage: billing.coveragePercentage,
          nhisAmount: billing.nhisAmount,
          patientAmount: billing.patientAmount,
          paymentStatus: billing.paymentStatus,
        },
      ),
    );
  }

  // Process radiology results
  // NOTE: radiology_requests PK is request_id, not id
  for (const r of radiologyResult.data || []) {
    const billing = getBillingAggregate(r.request_id);
    if (!billing) continue;
    allItems.push(
      createClaimItem(
        {
          ...r,
          id: r.request_id,
          patient: r.patient || billing.patient,
          encounter: billing.encounter,
          created_at: r.created_at || billing.createdAt,
          quantity: r.quantity || 1,
        },
        'radiology',
        billing.serviceName || r.imaging_type || 'Radiology Exam',
        billing.totalAmount,
        r.body_part || null,
        {
          coveragePercentage: billing.coveragePercentage,
          nhisAmount: billing.nhisAmount,
          patientAmount: billing.patientAmount,
          paymentStatus: billing.paymentStatus,
        },
      ),
    );
  }

  // Process pharmacy results - use billing totals (no per-item hardcoded pricing)
  // NOTE: prescriptions PK is prescription_id, not id
  for (const r of pharmacyResult.data || []) {
    const billing = getBillingAggregate(r.prescription_id);
    if (!billing) continue;
    const description = r.drug_name || null;
    allItems.push(
      createClaimItem(
        {
          ...r,
          id: r.prescription_id,
          patient: r.patient || billing.patient,
          encounter: billing.encounter,
          created_at: r.created_at || billing.createdAt,
          quantity: 1,
        },
        'pharmacy',
        billing.serviceName || r.drug_name || 'Prescription',
        billing.totalAmount,
        description,
        {
          coveragePercentage: billing.coveragePercentage,
          nhisAmount: billing.nhisAmount,
          patientAmount: billing.patientAmount,
          paymentStatus: billing.paymentStatus,
        },
      ),
    );
  }

  // Process procedure results (from clinical_requests with Procedure/Surgery type)
  for (const r of procedureResult.data || []) {
    const billing = getBillingAggregate(r.id);
    if (!billing) continue;
    allItems.push(
      createClaimItem(
        {
          ...r,
          patient: r.patient || billing.patient,
          encounter: r.encounter || billing.encounter,
          created_at: r.created_at || billing.createdAt,
          quantity: 1,
        },
        'procedure',
        r.procedure_name ||
          billing.serviceName ||
          `${r.request_type || 'Procedure'} Request`,
        billing.totalAmount,
        r.request_type || r.clinical_reason || null,
        {
          coveragePercentage: billing.coveragePercentage,
          nhisAmount: billing.nhisAmount,
          patientAmount: billing.patientAmount,
          paymentStatus: billing.paymentStatus,
        },
      ),
    );
  }

  // Process specialty results (dental, ophthalmology, physiotherapy referrals)
  for (const r of specialtyResult.data || []) {
    const billing = getBillingAggregate(r.id);
    if (!billing) continue;
    allItems.push(
      createClaimItem(
        {
          ...r,
          patient: r.patient || billing.patient,
          encounter: r.encounter || billing.encounter,
          created_at: r.created_at || billing.createdAt,
          quantity: 1,
        },
        'specialty',
        `${r.specialty_module || 'Specialty'} Referral`,
        billing.totalAmount,
        r.clinical_reason || null,
        {
          coveragePercentage: billing.coveragePercentage,
          nhisAmount: billing.nhisAmount,
          patientAmount: billing.patientAmount,
          paymentStatus: billing.paymentStatus,
        },
      ),
    );
  }

  // Process consultation results (NHIS billable consultation fees)
  for (const r of consultationsResult.data || []) {
    const billing = getBillingAggregate(r.consultation_id);
    if (!billing) continue;
    // Patient info comes from encounter → visit → patient (consultations.patient_id is varchar, not FK)
    const encounterData: any = r.encounter;
    const patientData: any = encounterData?.patient || billing.patient || null;

    allItems.push(
      createClaimItem(
        {
          id: r.consultation_id,
          patient_id: patientData?.id || r.patient_id,
          encounter_id: r.encounter_id,
          patient: patientData,
          encounter: encounterData || billing.encounter,
          created_at: r.consultation_date || r.created_at || billing.createdAt,
          nhis_approval_status: r.nhis_approval_status || 'not_required',
        },
        'consultation',
        billing.serviceName || 'Consultation',
        billing.totalAmount,
        r.diagnosis_text || null,
        {
          coveragePercentage: billing.coveragePercentage,
          nhisAmount: billing.nhisAmount,
          patientAmount: billing.patientAmount,
          paymentStatus: billing.paymentStatus,
        },
      ),
    );
  }

  // Process admissions results (NHIS billable inpatient stays)
  for (const r of admissionsResult.data || []) {
    const billing = getBillingAggregate(r.id);
    if (!billing) continue;
    allItems.push(
      createClaimItem(
        {
          id: r.id,
          patient_id: r.patient_id,
          encounter_id: r.encounter_id,
          patient: r.patient || billing.patient,
          encounter: r.encounter || billing.encounter,
          created_at: r.admission_date || r.created_at || billing.createdAt,
          nhis_approval_status: r.nhis_approval_status || 'not_required',
        },
        'admission',
        billing.serviceName ||
          `Admission: ${r.admitting_diagnosis || r.admission_type || 'Inpatient Stay'}`,
        billing.totalAmount,
        `Admission #${r.admission_number || 'N/A'}`,
        {
          coveragePercentage: billing.coveragePercentage,
          nhisAmount: billing.nhisAmount,
          patientAmount: billing.patientAmount,
          paymentStatus: billing.paymentStatus,
        },
      ),
    );
  }

  // Process physiotherapy sessions (NHIS billable physio treatment sessions)
  for (const r of physioSessionsResult.data || []) {
    const plan = r.plan as any;
    // Only include sessions linked to NHIS plans
    if (!plan?.is_nhis_plan) continue;
    const billing = getBillingAggregate(r.id) || getBillingAggregate(r.plan_id);
    const amount = billing?.totalAmount ?? 0;
    allItems.push(
      createClaimItem(
        {
          id: r.id,
          patient_id: r.patient?.id || null,
          encounter_id: plan?.encounter_id || null,
          patient: r.patient,
          encounter: billing?.encounter || null,
          created_at: r.session_date || r.created_at || billing?.createdAt,
          nhis_approval_status: plan?.nhis_approval_status || 'not_required',
        },
        'physiotherapy',
        `Physiotherapy Session #${r.session_number || '?'} — ${r.session_type || plan?.plan_name || 'PT'}`,
        amount,
        r.soap_assessment || r.therapist_notes || null,
        {
          coveragePercentage: billing?.coveragePercentage ?? 100,
          nhisAmount: billing?.nhisAmount ?? amount,
          patientAmount: billing?.patientAmount ?? 0,
          paymentStatus: billing?.paymentStatus ?? null,
          authorizationCode: plan?.nhis_authorization_code || null,
          hasAuthCode: !!plan?.nhis_authorization_code,
        },
      ),
    );
  }

  // Include billed items that do not have a matching service record
  for (const [serviceRefId, billing] of billingByServiceRef.entries()) {
    if (usedServiceRefs.has(serviceRefId)) continue;
    allItems.push(
      createClaimItem(
        {
          id: `billing-${serviceRefId}`,
          patient_id: billing.patient?.id || null,
          encounter_id: billing.encounter?.id || null,
          patient: billing.patient,
          encounter: billing.encounter,
          created_at: billing.createdAt,
          nhis_approval_status: 'approved',
        },
        getCategoryFromItemType(billing.itemType),
        billing.serviceName || 'Billing Item',
        billing.totalAmount,
        null,
        {
          coveragePercentage: billing.coveragePercentage,
          nhisAmount: billing.nhisAmount,
          patientAmount: billing.patientAmount,
          paymentStatus: billing.paymentStatus,
        },
      ),
    );
  }

  // Include billed items without service_reference_id (direct billing)
  for (const item of billingItemsWithoutRef) {
    const billingOrder = item.billing_order as any;
    let paymentStatus: 'Paid' | 'Partially Paid' | 'Pending' | null = null;
    if (billingOrder) {
      if (
        billingOrder.status === 'Paid' ||
        (billingOrder.balance_amount ?? 0) <= 0
      ) {
        paymentStatus = 'Paid';
      } else if ((billingOrder.paid_amount ?? 0) > 0) {
        paymentStatus = 'Partially Paid';
      } else {
        paymentStatus = 'Pending';
      }
    }
    allItems.push(
      createClaimItem(
        {
          id: item.id,
          patient_id: billingOrder?.patient_id || null,
          encounter_id: billingOrder?.encounter_id || null,
          patient: billingOrder?.patient || null,
          encounter: billingOrder?.encounter || null,
          created_at: billingOrder?.created_at || null,
          nhis_approval_status: 'approved',
          quantity: item.quantity || 1,
        },
        getCategoryFromItemType(item.item_type),
        item.service_name || item.item_name || 'Billing Item',
        item.gross_amount || item.total_price || 0,
        null,
        {
          coveragePercentage: item.nhis_percentage || 0,
          nhisAmount: item.nhis_payable || 0,
          patientAmount:
            item.patient_payable ||
            Math.max(
              (item.gross_amount || item.total_price || 0) -
                (item.nhis_payable || 0),
              0,
            ),
          paymentStatus,
        },
      ),
    );
  }

  // =========================================================================
  // UNIQUE SERVICE BILLING CONSTRAINT (NHIA Standard)
  // Prevent duplicate FFS billing: UNIQUE(encounter_id, serviceName, serviceDate)
  // For admissions: UNIQUE(encounter_id, serviceName, admission_day)
  // =========================================================================
  const billingDedup = new Set<string>();
  const deduplicatedItems: NhisComprehensiveClaimItem[] = [];
  for (const item of allItems) {
    const dateKey = item.serviceDate
      ? item.serviceDate.substring(0, 10)
      : 'no-date';
    const dedupKey = `${item.encounterId || item.patientId}|${item.serviceName}|${dateKey}`;
    if (billingDedup.has(dedupKey)) {
      // Duplicate detected — skip this item (keep the first occurrence)
      continue;
    }
    billingDedup.add(dedupKey);
    deduplicatedItems.push(item);
  }

  // Apply filters (date filtering already done at DB level by applyDateFilter)
  let filteredItems = deduplicatedItems;

  // Date filters are now applied at the database query level for performance,
  // but keep JS-level check as a safety net for records from billing items
  // (which get date from parent billing_order.created_at, not their own created_at)
  if (filters.startDate) {
    filteredItems = filteredItems.filter(
      (item) => new Date(item.serviceDate) >= new Date(filters.startDate!),
    );
  }
  if (filters.endDate) {
    const endDateWithTime = new Date(`${filters.endDate}T23:59:59.999Z`);
    filteredItems = filteredItems.filter(
      (item) => new Date(item.serviceDate) <= endDateWithTime,
    );
  }
  if (filters.insuranceType) {
    filteredItems = filteredItems.filter(
      (item) => item.insuranceType === filters.insuranceType,
    );
  }
  if (filters.category) {
    filteredItems = filteredItems.filter(
      (item) => item.category === filters.category,
    );
  }
  if (filters.hasAuthCode !== undefined) {
    filteredItems = filteredItems.filter(
      (item) => item.hasAuthCode === filters.hasAuthCode,
    );
  }

  // Sort by date descending
  filteredItems.sort(
    (a, b) =>
      new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime(),
  );

  // Re-number after filtering
  filteredItems.forEach((item, idx) => {
    item.serialNumber = idx + 1;
  });

  // Calculate summaries
  const itemsWithAuthCode = filteredItems.filter((item) => item.hasAuthCode);
  // NHIA FIX: Pending auth = no auth code AND claim is NOT paid
  // Paid claims must NEVER appear in the pending authorization table
  const itemsWithoutAuthCode = filteredItems.filter(
    (item) => !item.hasAuthCode && item.claimStatus !== 'Paid',
  );
  const totalVerifiedNhis = filteredItems
    .filter((item) => item.paymentStatus === 'Paid')
    .reduce((sum, item) => sum + item.nhisAmount, 0);
  const totalPendingNhis = filteredItems
    .filter((item) => item.paymentStatus !== 'Paid')
    .reduce((sum, item) => sum + item.nhisAmount, 0);

  // Group by category
  const categoryMap = new Map<
    string,
    {
      count: number;
      totalAmount: number;
      nhisCovered: number;
      patientPortion: number;
    }
  >();
  const categoryLabels: Record<string, string> = {
    lab: 'Laboratory',
    radiology: 'Radiology',
    pharmacy: 'Pharmacy',
    procedure: 'Procedures',
    specialty: 'Specialty',
    consultation: 'Consultation',
    nursing: 'Nursing',
    admission: 'Admission/Inpatient',
    physiotherapy: 'Physiotherapy',
  };

  for (const item of filteredItems) {
    if (!categoryMap.has(item.category)) {
      categoryMap.set(item.category, {
        count: 0,
        totalAmount: 0,
        nhisCovered: 0,
        patientPortion: 0,
      });
    }
    const cat = categoryMap.get(item.category)!;
    cat.count++;
    cat.totalAmount += item.totalAmount;
    cat.nhisCovered += item.nhisAmount;
    cat.patientPortion += item.patientAmount;
  }

  const byCategory = Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      categoryLabel: categoryLabels[category] || category,
      ...stats,
    }))
    .sort((a, b) => b.nhisCovered - a.nhisCovered);

  // Group by insurance type
  const insuranceMap = new Map<
    string,
    { count: number; totalAmount: number; nhisCovered: number }
  >();
  for (const item of filteredItems) {
    if (!insuranceMap.has(item.insuranceType)) {
      insuranceMap.set(item.insuranceType, {
        count: 0,
        totalAmount: 0,
        nhisCovered: 0,
      });
    }
    const ins = insuranceMap.get(item.insuranceType)!;
    ins.count++;
    ins.totalAmount += item.totalAmount;
    ins.nhisCovered += item.nhisAmount;
  }

  const byInsuranceType = Array.from(insuranceMap.entries())
    .map(([insuranceType, stats]) => ({
      insuranceType,
      ...stats,
    }))
    .sort((a, b) => b.nhisCovered - a.nhisCovered);

  // === Payment Portion Totals (NHIS Nigeria Model) ===
  const totalCapAmount = filteredItems.reduce(
    (sum, item) => sum + item.capAmount,
    0,
  );
  const totalFfsAmount = filteredItems.reduce(
    (sum, item) => sum + item.ffsAmount,
    0,
  );
  const totalPrivateAmount = filteredItems.reduce(
    (sum, item) => sum + item.privateAmount,
    0,
  );
  const totalCopayAmount = filteredItems.reduce(
    (sum, item) => sum + item.copayAmount,
    0,
  );
  const totalNetNhisPayable = filteredItems.reduce(
    (sum, item) => sum + item.netNhisPayable,
    0,
  );

  // Group by portion type
  const portionMap = new Map<string, { count: number; totalAmount: number }>();
  for (const item of filteredItems) {
    if (!portionMap.has(item.portionType)) {
      portionMap.set(item.portionType, { count: 0, totalAmount: 0 });
    }
    const p = portionMap.get(item.portionType)!;
    p.count++;
    p.totalAmount += item.totalAmount;
  }
  const byPortionType = Array.from(portionMap.entries())
    .map(([portionType, stats]) => ({
      portionType,
      ...stats,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    totalItems: filteredItems.length,
    totalAmount: filteredItems.reduce((sum, item) => sum + item.totalAmount, 0),
    totalNhisCovered: filteredItems.reduce(
      (sum, item) => sum + item.nhisAmount,
      0,
    ),
    totalPatientPortion: filteredItems.reduce(
      (sum, item) => sum + item.patientAmount,
      0,
    ),
    totalVerifiedNhis,
    totalPendingNhis,
    totalCapAmount,
    totalFfsAmount,
    totalPrivateAmount,
    totalCopayAmount,
    totalNetNhisPayable,
    byPortionType,
    byCategory,
    byInsuranceType,
    itemsWithAuthCode,
    itemsWithoutAuthCode,
    allItems: filteredItems,
  };
}

/**
 * Create an outgoing NHIS external referral request
 * Called by doctor during consultation to refer patient to external hospital
 */
export async function createOutgoingReferral(dto: CreateOutgoingReferralDTO) {
  const { data, error } = await supabase
    .from('nhis_referral_queue')
    .insert({
      patient_id: dto.patient_id,
      request_type: 'outgoing_nhis_referral',
      referral_direction: 'outgoing',
      status: 'pending',
      urgency: dto.urgency,

      // Clinical data from consultation
      chief_complaint: dto.clinical_findings,
      examination_findings: dto.clinical_findings,
      investigation_findings: dto.investigation_findings,
      provisional_diagnosis: dto.provisional_diagnosis,
      clinical_basis: dto.reason_for_referral,
      clinical_notes: dto.additional_notes,

      // Source encounter reference
      source_encounter_id: dto.source_encounter_id,
      requesting_doctor_id: dto.requesting_doctor_id,

      // Requester
      requested_by: dto.requested_by,
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch pending outgoing referrals for NHIS desk
 */
export async function fetchPendingOutgoingReferrals() {
  const { data, error } = await supabase
    .from('nhis_pending_outgoing_referrals')
    .select('*');

  if (error) throw error;
  return data || [];
}

/**
 * Fetch approved outgoing referrals for Encounter module
 */
export async function fetchApprovedOutgoingReferrals(includeCompleted = false) {
  let query = supabase
    .from('nhis_outgoing_referrals_view')
    .select('*')
    .order('processed_at', { ascending: false });

  if (includeCompleted) {
    query = query.in('queue_status', ['approved', 'completed']);
  } else {
    query = query.eq('queue_status', 'approved');
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as OutgoingReferralItem[];
}

/**
 * Approve outgoing referral (NHIS desk)
 * Enters referral code, destination facility, and validity period
 */
export async function approveOutgoingReferral(dto: ApproveOutgoingReferralDTO) {
  const { data, error } = await supabase.rpc('approve_outgoing_referral', {
    p_queue_id: dto.queue_id,
    p_nhis_referral_code: dto.nhis_referral_code,
    p_destination_facility_name: dto.destination_facility_name,
    p_destination_facility_nhis_id: dto.destination_facility_nhis_id || null,
    p_destination_facility_address: dto.destination_facility_address || null,
    p_referral_valid_from: dto.referral_valid_from,
    p_referral_valid_to: dto.referral_valid_to,
    p_processing_notes: dto.processing_notes || null,
    p_processed_by: dto.processed_by,
  });

  if (error) throw error;
  return data;
}

/**
 * Record that a referral form was printed
 */
export async function recordReferralPrint(queueId: string, printedBy: string) {
  const { data, error } = await supabase.rpc('record_referral_print', {
    p_queue_id: queueId,
    p_printed_by: printedBy,
  });

  if (error) throw error;
  return data;
}

/**
 * Get outgoing referral stats
 */
export async function getOutgoingReferralStats() {
  const [pendingResult, approvedResult, completedResult] = await Promise.all([
    supabase
      .from('nhis_referral_queue')
      .select('*', { count: 'exact', head: true })
      .eq('referral_direction', 'outgoing')
      .eq('status', 'pending'),
    supabase
      .from('nhis_referral_queue')
      .select('*', { count: 'exact', head: true })
      .eq('referral_direction', 'outgoing')
      .eq('status', 'approved'),
    supabase
      .from('nhis_referral_queue')
      .select('*', { count: 'exact', head: true })
      .eq('referral_direction', 'outgoing')
      .eq('status', 'completed'),
  ]);

  return {
    pending: pendingResult.count || 0,
    approved: approvedResult.count || 0,
    completed: completedResult.count || 0,
  };
}

// =============================================================================
// Pre-Authorization Configuration API
// =============================================================================

export interface CatalogueServiceItem {
  id: string;
  code: string;
  name: string;
  service_type: 'Drug' | 'Lab' | 'Imaging' | 'Procedure';
  price: number;
  nhis_price: number | null;
  is_nhis_covered: boolean;
  requires_nhis_authorization: boolean;
  is_active: boolean;
  category?: string;
}

/**
 * Search across ALL catalogue tables (drugs, labs, imaging, procedures)
 * Returns a unified list for the pre-auth configuration UI.
 */
export async function searchAllCatalogueServices(
  query: string,
): Promise<CatalogueServiceItem[]> {
  const sanitized = sanitizeFilterValue(query).trim();
  if (!sanitized || sanitized.length < 2) return [];

  const searchPattern = `%${sanitized}%`;

  const [drugRes, labRes, imagingRes, procedureRes] = await Promise.all([
    supabase
      .from('drug_catalogue')
      .select(
        'id, code, name, price, nhis_price, is_nhis_covered, requires_nhis_authorization, is_active, category',
      )
      .or(`name.ilike.${searchPattern},code.ilike.${searchPattern}`)
      .eq('is_active', true)
      .order('name')
      .limit(50),
    supabase
      .from('lab_test_catalogue')
      .select(
        'id, code, name, price, nhis_price, is_nhis_covered, requires_nhis_authorization, is_active, category',
      )
      .or(`name.ilike.${searchPattern},code.ilike.${searchPattern}`)
      .eq('is_active', true)
      .order('name')
      .limit(50),
    supabase
      .from('imaging_catalogue')
      .select(
        'id, code, name, price, nhis_price, is_nhis_covered, requires_nhis_authorization, is_active, modality',
      )
      .or(`name.ilike.${searchPattern},code.ilike.${searchPattern}`)
      .eq('is_active', true)
      .order('name')
      .limit(50),
    supabase
      .from('procedure_catalogue')
      .select(
        'id, code, name, base_price, nhis_price, requires_nhis_authorization, is_active, category',
      )
      .or(`name.ilike.${searchPattern},code.ilike.${searchPattern}`)
      .eq('is_active', true)
      .order('name')
      .limit(50),
  ]);

  const results: CatalogueServiceItem[] = [];

  // Drugs
  if (drugRes.data) {
    for (const d of drugRes.data) {
      results.push({
        id: d.id,
        code: d.code || '',
        name: d.name,
        service_type: 'Drug',
        price: d.price || 0,
        nhis_price: d.nhis_price,
        is_nhis_covered: d.is_nhis_covered ?? false,
        requires_nhis_authorization: d.requires_nhis_authorization ?? false,
        is_active: d.is_active ?? true,
        category: d.category || undefined,
      });
    }
  }

  // Lab Tests
  if (labRes.data) {
    for (const l of labRes.data) {
      results.push({
        id: l.id,
        code: l.code || '',
        name: l.name,
        service_type: 'Lab',
        price: l.price || 0,
        nhis_price: l.nhis_price,
        is_nhis_covered: l.is_nhis_covered ?? false,
        requires_nhis_authorization: l.requires_nhis_authorization ?? false,
        is_active: l.is_active ?? true,
        category: l.category || undefined,
      });
    }
  }

  // Imaging
  if (imagingRes.data) {
    for (const i of imagingRes.data) {
      results.push({
        id: i.id,
        code: i.code || '',
        name: i.name,
        service_type: 'Imaging',
        price: i.price || 0,
        nhis_price: i.nhis_price,
        is_nhis_covered: i.is_nhis_covered ?? false,
        requires_nhis_authorization: i.requires_nhis_authorization ?? false,
        is_active: i.is_active ?? true,
        category: (i as any).modality || undefined,
      });
    }
  }

  // Procedures
  if (procedureRes.data) {
    for (const p of procedureRes.data) {
      results.push({
        id: p.id,
        code: p.code || '',
        name: p.name,
        service_type: 'Procedure',
        price: p.base_price || 0,
        nhis_price: p.nhis_price,
        is_nhis_covered: false,
        requires_nhis_authorization: p.requires_nhis_authorization ?? false,
        is_active: p.is_active ?? true,
        category: p.category || undefined,
      });
    }
  }

  // Sort by name
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

/**
 * Fetch all services currently marked as requiring NHIS pre-authorization
 */
export async function getPreAuthRequiredServices(): Promise<
  CatalogueServiceItem[]
> {
  const [drugRes, labRes, imagingRes, procedureRes] = await Promise.all([
    supabase
      .from('drug_catalogue')
      .select(
        'id, code, name, price, nhis_price, is_nhis_covered, requires_nhis_authorization, is_active, category',
      )
      .eq('requires_nhis_authorization', true)
      .order('name'),
    supabase
      .from('lab_test_catalogue')
      .select(
        'id, code, name, price, nhis_price, is_nhis_covered, requires_nhis_authorization, is_active, category',
      )
      .eq('requires_nhis_authorization', true)
      .order('name'),
    supabase
      .from('imaging_catalogue')
      .select(
        'id, code, name, price, nhis_price, is_nhis_covered, requires_nhis_authorization, is_active, modality',
      )
      .eq('requires_nhis_authorization', true)
      .order('name'),
    supabase
      .from('procedure_catalogue')
      .select(
        'id, code, name, base_price, nhis_price, requires_nhis_authorization, is_active, category',
      )
      .eq('requires_nhis_authorization', true)
      .order('name'),
  ]);

  const results: CatalogueServiceItem[] = [];

  if (drugRes.data) {
    for (const d of drugRes.data) {
      results.push({
        id: d.id,
        code: d.code || '',
        name: d.name,
        service_type: 'Drug',
        price: d.price || 0,
        nhis_price: d.nhis_price,
        is_nhis_covered: d.is_nhis_covered ?? false,
        requires_nhis_authorization: true,
        is_active: d.is_active ?? true,
        category: d.category || undefined,
      });
    }
  }
  if (labRes.data) {
    for (const l of labRes.data) {
      results.push({
        id: l.id,
        code: l.code || '',
        name: l.name,
        service_type: 'Lab',
        price: l.price || 0,
        nhis_price: l.nhis_price,
        is_nhis_covered: l.is_nhis_covered ?? false,
        requires_nhis_authorization: true,
        is_active: l.is_active ?? true,
        category: l.category || undefined,
      });
    }
  }
  if (imagingRes.data) {
    for (const i of imagingRes.data) {
      results.push({
        id: i.id,
        code: i.code || '',
        name: i.name,
        service_type: 'Imaging',
        price: i.price || 0,
        nhis_price: i.nhis_price,
        is_nhis_covered: i.is_nhis_covered ?? false,
        requires_nhis_authorization: true,
        is_active: i.is_active ?? true,
        category: (i as any).modality || undefined,
      });
    }
  }
  if (procedureRes.data) {
    for (const p of procedureRes.data) {
      results.push({
        id: p.id,
        code: p.code || '',
        name: p.name,
        service_type: 'Procedure',
        price: p.base_price || 0,
        nhis_price: p.nhis_price,
        is_nhis_covered: false,
        requires_nhis_authorization: true,
        is_active: p.is_active ?? true,
        category: p.category || undefined,
      });
    }
  }

  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

/** Map service_type to the corresponding table name */
function catalogueTableForServiceType(
  type: CatalogueServiceItem['service_type'],
): string {
  switch (type) {
    case 'Drug':
      return 'drug_catalogue';
    case 'Lab':
      return 'lab_test_catalogue';
    case 'Imaging':
      return 'imaging_catalogue';
    case 'Procedure':
      return 'procedure_catalogue';
  }
}

/**
 * Batch-toggle requires_nhis_authorization for a list of services.
 * Groups by service_type to minimise DB round-trips.
 */
export async function togglePreAuthRequirement(
  items: { id: string; service_type: CatalogueServiceItem['service_type'] }[],
  value: boolean,
): Promise<{ success: boolean; updated: number; errors: string[] }> {
  const grouped = new Map<string, string[]>();
  for (const item of items) {
    const table = catalogueTableForServiceType(item.service_type);
    if (!grouped.has(table)) grouped.set(table, []);
    grouped.get(table)!.push(item.id);
  }

  let totalUpdated = 0;
  const errors: string[] = [];

  for (const [table, ids] of grouped) {
    const { error, count } = await supabase
      .from(table)
      .update({ requires_nhis_authorization: value })
      .in('id', ids);

    if (error) {
      errors.push(`${table}: ${error.message}`);
    } else {
      totalUpdated += count ?? ids.length;
    }
  }

  return { success: errors.length === 0, updated: totalUpdated, errors };
}