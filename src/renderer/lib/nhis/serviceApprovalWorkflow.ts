// =============================================================================
// NHIS Service Approval Workflow
//
// Handles automatic and manual NHIS approval workflows for services:
// - Lab requests
// - Radiology requests
// - Prescriptions
// - Specialty referrals (dental, ophthalmology, physiotherapy)
// =============================================================================

import { supabase } from '../../api/supabaseClient';
import { isNhisFeatureEnabled } from '../../config/features';

// =============================================================================
// Types
// =============================================================================

export type NhisServiceType =
  | 'lab_request'
  | 'radiology_request'
  | 'prescription'
  | 'procedure'
  | 'dental_referral'
  | 'ophthalmology_referral'
  | 'physiotherapy_referral'
  | 'physiotherapy_plan'
  | 'physiotherapy_plan_extension'
  | 'specialty_referral';

export type NhisApprovalStatus =
  | 'not_required'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired';

export interface ServiceApprovalRequest {
  serviceType: NhisServiceType;
  serviceId: string;
  serviceName: string;
  serviceCode?: string;
  serviceCategory?:
    | 'lab'
    | 'radiology'
    | 'pharmacy'
    | 'procedure'
    | 'specialty'
    | 'physiotherapy';
  encounterId: string;
  patientId: string;
  patientEmrNumber?: string;
  patientName?: string;
  estimatedCost: number;
  requestedBy: string;
  // Clinical information for NHIS pre-authorization
  clinicalFindings?: string;
  provisionalDiagnosis?: string;
  clinicalJustification?: string;
  requestReason?: string;
}

export interface ServiceApprovalResult {
  requiresApproval: boolean;
  autoApproved: boolean;
  approvalId?: string;
  status: NhisApprovalStatus;
  reason: string;
}

export interface ThresholdCheckResult {
  requiresApproval: boolean;
  autoApprove: boolean;
  thresholdAmount: number | null;
  reason: string;
}

// =============================================================================
// Check if Patient is NHIS
// =============================================================================

export async function isPatientNhis(patientId: string): Promise<boolean> {
  if (!isNhisFeatureEnabled()) return false;

  // Check both nhis_profiles and patient insurance_type
  const [profileResult, patientResult] = await Promise.all([
    supabase
      .from('nhis_profiles')
      .select('id')
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('patients')
      .select('insurance_type, patient_category')
      .eq('patient_id', patientId)
      .maybeSingle(),
  ]);

  // Has active NHIS profile
  if (profileResult.data) return true;

  // Check insurance_type
  const insuranceType = patientResult.data?.insurance_type?.toLowerCase() || '';
  const patientCategory =
    patientResult.data?.patient_category?.toLowerCase() || '';

  const nhisTypes = [
    'nhis',
    'military nhis',
    'civilian nhis',
    'military_nhis',
    'civilian_nhis',
    'personnel',
    'dhml',
    'armed forces',
    'gifship',
    'security services nhis',
    'security_services_nhis',
  ];

  return nhisTypes.some(
    (type) => insuranceType.includes(type) || patientCategory.includes(type),
  );
}

// =============================================================================
// Check Encounter NHIS Verification Status
// =============================================================================

export async function isEncounterNhisVerified(encounterId: string): Promise<{
  isNhis: boolean;
  isVerified: boolean;
  verificationStatus: string;
  tariffGroup: string | null;
}> {
  if (!isNhisFeatureEnabled()) {
    return {
      isNhis: false,
      isVerified: false,
      verificationStatus: 'not_applicable',
      tariffGroup: null,
    };
  }

  const { data, error } = await supabase
    .from('visits')
    .select(
      'payer_type, nhis_verification_status, nhis_tariff_group, insurance_type',
    )
    .eq('visit_id', encounterId)
    .maybeSingle();

  if (error || !data) {
    return {
      isNhis: false,
      isVerified: false,
      verificationStatus: 'not_applicable',
      tariffGroup: null,
    };
  }

  const isNhis =
    data.payer_type === 'nhis' ||
    (data.insurance_type?.toLowerCase() || '').includes('nhis');

  return {
    isNhis,
    isVerified: data.nhis_verification_status === 'verified',
    verificationStatus: data.nhis_verification_status || 'not_applicable',
    tariffGroup: data.nhis_tariff_group,
  };
}

// =============================================================================
// Get Tariff Rules for Threshold Check
// =============================================================================

async function getTariffRules(
  serviceType: NhisServiceType,
  tariffGroup?: string | null,
): Promise<{
  requiresApproval: boolean;
  thresholdAmount: number | null;
  autoApproveBelow: boolean;
}> {
  // Default: require approval for specialty referrals
  const specialtyTypes = [
    'dental_referral',
    'ophthalmology_referral',
    'physiotherapy_referral',
    'physiotherapy_plan',
    'specialty_referral',
  ];

  if (specialtyTypes.includes(serviceType)) {
    return {
      requiresApproval: true,
      thresholdAmount: null,
      autoApproveBelow: false,
    };
  }

  // Check tariff rules table
  let query = supabase
    .from('nhis_tariff_rules')
    .select('approval_required, approval_threshold_amount')
    .eq('service_type', serviceType)
    .eq('is_active', true);

  if (tariffGroup) {
    query = query.eq('tariff_group', tariffGroup);
  }

  const { data: rules } = await query.limit(1).maybeSingle();

  if (rules) {
    return {
      requiresApproval: rules.approval_required ?? false,
      thresholdAmount: rules.approval_threshold_amount,
      autoApproveBelow:
        !rules.approval_required && rules.approval_threshold_amount !== null,
    };
  }

  // Check policy config for default thresholds
  const { data: config } = await supabase
    .from('nhis_policy_config')
    .select('approval_rules')
    .eq('is_active', true)
    .maybeSingle();

  if (config?.approval_rules) {
    const ruleKey = serviceType.replace('_request', '');
    const rule =
      config.approval_rules[ruleKey] || config.approval_rules[serviceType];

    if (rule) {
      return {
        requiresApproval: rule.requires_approval ?? false,
        thresholdAmount: rule.threshold_amount ?? null,
        autoApproveBelow: !rule.requires_approval,
      };
    }
  }

  // Default thresholds by service type
  const defaultThresholds: Record<string, number> = {
    lab_request: 10000, // Auto-approve lab tests under ₦10,000
    radiology_request: 20000, // Auto-approve radiology under ₦20,000
    prescription: 15000, // Auto-approve prescriptions under ₦15,000
    procedure: 50000, // Procedures require approval above ₦50,000
  };

  return {
    requiresApproval: false,
    thresholdAmount: defaultThresholds[serviceType] ?? null,
    autoApproveBelow: true,
  };
}

// =============================================================================
// Check if Service Requires NHIS Approval
// =============================================================================

/**
 * Check if a specific service requires NHIS pre-authorization based on:
 * 1. The requires_nhis_authorization flag in the service catalogue
 * 2. Being a specialty referral (always requires approval)
 *
 * Only services marked with requires_nhis_authorization=true will be routed
 * to the NHIS module for verification. This is configured in the Billing
 * module's "NHIS Required Services" section.
 */
export async function checkServiceApprovalRequired(
  request: Omit<ServiceApprovalRequest, 'requestedBy'> & { serviceId?: string },
): Promise<ThresholdCheckResult> {
  if (!isNhisFeatureEnabled()) {
    return {
      requiresApproval: false,
      autoApprove: true,
      thresholdAmount: null,
      reason: 'NHIS approval is disabled for this facility',
    };
  }

  // First check if patient is NHIS
  const isNhis = await isPatientNhis(request.patientId);

  if (!isNhis) {
    return {
      requiresApproval: false,
      autoApprove: false,
      thresholdAmount: null,
      reason: 'Patient is not an NHIS beneficiary',
    };
  }

  // Check encounter verification status
  const encounterStatus = await isEncounterNhisVerified(request.encounterId);

  if (!encounterStatus.isNhis) {
    return {
      requiresApproval: false,
      autoApprove: false,
      thresholdAmount: null,
      reason: 'Encounter is not marked as NHIS',
    };
  }

  // Specialty referrals and physio plans always require approval
  const specialtyTypes = [
    'dental_referral',
    'ophthalmology_referral',
    'physiotherapy_referral',
    'physiotherapy_plan',
    'physiotherapy_plan_extension',
    'specialty_referral',
  ];
  if (specialtyTypes.includes(request.serviceType)) {
    return {
      requiresApproval: true,
      autoApprove: false,
      thresholdAmount: null,
      reason:
        request.serviceType === 'physiotherapy_plan'
          ? 'NHIS physiotherapy plans require pre-authorization'
          : request.serviceType === 'physiotherapy_plan_extension'
            ? 'NHIS physiotherapy plan extensions require pre-authorization'
            : 'Specialty referrals require NHIS approval',
    };
  }

  // Check if this specific service requires NHIS pre-authorization
  // This is configured in the Billing module's service catalogues
  const serviceRequiresAuth = await checkServiceCatalogueNhisFlag(
    request.serviceType,
    request.serviceCode,
  );

  if (!serviceRequiresAuth) {
    // Service is not marked as requiring NHIS authorization
    // Auto-approve without creating an approval request
    return {
      requiresApproval: false,
      autoApprove: true,
      thresholdAmount: null,
      reason:
        'Service does not require NHIS pre-authorization (not marked in catalogue)',
    };
  }

  // Service requires NHIS approval - check threshold rules
  const tariffRules = await getTariffRules(
    request.serviceType,
    encounterStatus.tariffGroup,
  );

  // Check against threshold
  if (tariffRules.thresholdAmount !== null) {
    if (request.estimatedCost <= tariffRules.thresholdAmount) {
      return {
        requiresApproval: false,
        autoApprove: true,
        thresholdAmount: tariffRules.thresholdAmount,
        reason: `Auto-approved: Cost (₦${request.estimatedCost.toLocaleString()}) is below threshold (₦${tariffRules.thresholdAmount.toLocaleString()})`,
      };
    }
    return {
      requiresApproval: true,
      autoApprove: false,
      thresholdAmount: tariffRules.thresholdAmount,
      reason: `Approval required: Cost (₦${request.estimatedCost.toLocaleString()}) exceeds threshold (₦${tariffRules.thresholdAmount.toLocaleString()})`,
    };
  }

  // Service is marked as requiring NHIS auth but no threshold - require approval
  return {
    requiresApproval: true,
    autoApprove: false,
    thresholdAmount: null,
    reason: 'Service requires NHIS pre-authorization (marked in catalogue)',
  };
}

// =============================================================================
// Check Service Catalogue NHIS Flag
// =============================================================================

/**
 * Checks if a service is marked as requiring NHIS pre-authorization
 * in its respective catalogue (lab_test_catalogue, imaging_catalogue,
 * procedure_catalogue, or drug_catalogue).
 */
async function checkServiceCatalogueNhisFlag(
  serviceType: NhisServiceType,
  serviceCode?: string,
): Promise<boolean> {
  if (!serviceCode) return false;

  // Radiology-specific rule:
  // Require NHIS pre-authorization when the study is explicitly not fully covered
  // (service percentage below 100 or NHIS coverage disabled), even if the explicit
  // requires_nhis_authorization toggle is false.
  if (serviceType === 'radiology_request') {
    const { data, error } = await supabase
      .from('imaging_catalogue')
      .select('requires_nhis_authorization, is_nhis_covered, nhis_percentage')
      .eq('code', serviceCode)
      .maybeSingle();

    if (error || !data) return false;

    const requiresFlag = data.requires_nhis_authorization === true;
    const notCovered = data.is_nhis_covered === false;
    const partialCoverage =
      typeof data.nhis_percentage === 'number' &&
      data.nhis_percentage >= 0 &&
      data.nhis_percentage < 100;

    return requiresFlag || notCovered || partialCoverage;
  }

  // Map service type to catalogue table and code field
  const catalogueConfig: Record<string, { table: string; codeField: string }> =
    {
      lab_request: { table: 'lab_test_catalogue', codeField: 'code' },
      radiology_request: { table: 'imaging_catalogue', codeField: 'code' },
      prescription: { table: 'drug_catalogue', codeField: 'code' },
      procedure: { table: 'procedure_catalogue', codeField: 'code' },
    };

  const config = catalogueConfig[serviceType];
  if (!config) return false;

  const { data, error } = await supabase
    .from(config.table)
    .select('requires_nhis_authorization')
    .eq(config.codeField, serviceCode)
    .maybeSingle();

  if (error || !data) return false;

  return data.requires_nhis_authorization === true;
}

// =============================================================================
// Create Service Approval Request
// =============================================================================

export async function createServiceApprovalRequest(
  request: ServiceApprovalRequest,
): Promise<ServiceApprovalResult> {
  if (!isNhisFeatureEnabled()) {
    return {
      requiresApproval: false,
      autoApproved: true,
      status: 'not_required',
      reason: 'NHIS approval is disabled for this facility',
    };
  }

  // Check if approval is required
  const thresholdCheck = await checkServiceApprovalRequired(request);

  // If not an NHIS patient or auto-approved, update status directly
  if (!thresholdCheck.requiresApproval) {
    // Update service with approved status
    await updateServiceNhisStatus(
      request.serviceType,
      request.serviceId,
      thresholdCheck.autoApprove ? 'approved' : 'not_required',
    );

    return {
      requiresApproval: false,
      autoApproved: thresholdCheck.autoApprove,
      status: thresholdCheck.autoApprove ? 'approved' : 'not_required',
      reason: thresholdCheck.reason,
    };
  }

  // Create approval request in nhis_approvals table
  const { data: approval, error } = await supabase
    .from('nhis_approvals')
    .insert({
      service_request_id: request.serviceId,
      service_type: request.serviceType,
      service_category: request.serviceCategory,
      encounter_id: request.encounterId,
      patient_id: request.patientId,
      patient_emr_number: request.patientEmrNumber,
      patient_name: request.patientName,
      service_name: request.serviceName,
      service_code: request.serviceCode,
      estimated_cost: request.estimatedCost,
      requested_by: request.requestedBy,
      requested_at: new Date().toISOString(),
      request_reason: request.requestReason,
      clinical_justification: request.clinicalJustification,
      clinical_findings: request.clinicalFindings,
      provisional_diagnosis: request.provisionalDiagnosis,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create NHIS approval request:', error);
    throw error;
  }

  // Update service with pending status
  await updateServiceNhisStatus(
    request.serviceType,
    request.serviceId,
    'pending',
  );

  return {
    requiresApproval: true,
    autoApproved: false,
    approvalId: approval.id,
    status: 'pending',
    reason: thresholdCheck.reason,
  };
}

// =============================================================================
// Update Service NHIS Status
// =============================================================================

async function updateServiceNhisStatus(
  serviceType: NhisServiceType,
  serviceId: string,
  status: NhisApprovalStatus,
): Promise<void> {
  const tableConfig: Record<string, { table: string; idColumn: string }> = {
    lab_request: { table: 'lab_requests', idColumn: 'request_id' },
    radiology_request: { table: 'radiology_requests', idColumn: 'request_id' },
    prescription: { table: 'prescriptions', idColumn: 'prescription_id' },
    procedure: { table: 'procedures', idColumn: 'id' },
    dental_referral: { table: 'specialty_referrals', idColumn: 'id' },
    ophthalmology_referral: { table: 'specialty_referrals', idColumn: 'id' },
    physiotherapy_referral: { table: 'specialty_referrals', idColumn: 'id' },
    physiotherapy_plan: { table: 'physio_plans', idColumn: 'plan_id' },
    physiotherapy_plan_extension: { table: 'physio_plans', idColumn: 'plan_id' },
    specialty_referral: { table: 'specialty_referrals', idColumn: 'id' },
  };

  const config = tableConfig[serviceType];
  if (!config) {
    console.warn(`Unknown service type: ${serviceType}`);
    return;
  }

  const { error } = await supabase
    .from(config.table)
    .update({
      nhis_approval_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq(config.idColumn, serviceId);

  if (error) {
    console.error(`Failed to update NHIS status for ${serviceType}:`, error);
  }
}

// =============================================================================
// Get Approval Status for Service
// =============================================================================

export async function getServiceApprovalStatus(
  serviceType: NhisServiceType,
  serviceId: string,
): Promise<{
  status: NhisApprovalStatus;
  approvalId?: string;
  decidedBy?: string;
  decidedAt?: string;
  rejectionReason?: string;
} | null> {
  if (!isNhisFeatureEnabled()) return null;

  const { data, error } = await supabase
    .from('nhis_approvals')
    .select(
      `
      id,
      status,
      decided_by,
      decided_at,
      rejection_reason,
      decided_by_staff:staff!decided_by (first_name, last_name)
    `,
    )
    .eq('service_request_id', serviceId)
    .eq('service_type', serviceType)
    .maybeSingle();

  if (error || !data) return null;

  return {
    status: data.status as NhisApprovalStatus,
    approvalId: data.id,
    decidedBy: data.decided_by_staff
      ? `${(data.decided_by_staff as any).first_name} ${(data.decided_by_staff as any).last_name}`
      : undefined,
    decidedAt: data.decided_at,
    rejectionReason: data.rejection_reason,
  };
}

// =============================================================================
// Process Batch Approval for Multiple Services
// =============================================================================

export async function processBatchApproval(
  approvalIds: string[],
  decision: 'approved' | 'rejected',
  decidedBy: string,
  notes?: string,
  rejectionReason?: string,
): Promise<{ success: number; failed: number; errors: string[] }> {
  if (!isNhisFeatureEnabled()) {
    return {
      success: 0,
      failed: approvalIds.length,
      errors: ['NHIS approval is disabled for this facility'],
    };
  }

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const approvalId of approvalIds) {
    try {
      // Get approval details
      const { data: approval, error: fetchError } = await supabase
        .from('nhis_approvals')
        .select('service_type, service_request_id')
        .eq('id', approvalId)
        .single();

      if (fetchError || !approval) {
        failed++;
        errors.push(`Approval ${approvalId}: Not found`);
        continue;
      }

      // Update approval
      const { error: updateError } = await supabase
        .from('nhis_approvals')
        .update({
          status: decision,
          decided_by: decidedBy,
          decided_at: new Date().toISOString(),
          decision_notes: notes,
          rejection_reason: decision === 'rejected' ? rejectionReason : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', approvalId);

      if (updateError) {
        failed++;
        errors.push(`Approval ${approvalId}: ${updateError.message}`);
        continue;
      }

      // Update service status
      await updateServiceNhisStatus(
        approval.service_type as NhisServiceType,
        approval.service_request_id,
        decision,
      );

      success++;
    } catch (err) {
      failed++;
      errors.push(
        `Approval ${approvalId}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  return { success, failed, errors };
}

// =============================================================================
// Get Pending Approvals Count by Service Type
// =============================================================================

export async function getPendingApprovalCounts(): Promise<
  Record<string, number>
> {
  if (!isNhisFeatureEnabled()) return {};

  const { data, error } = await supabase
    .from('nhis_approvals')
    .select('service_type')
    .eq('status', 'pending');

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const item of data) {
    counts[item.service_type] = (counts[item.service_type] || 0) + 1;
  }

  return counts;
}

// =============================================================================
// Check if Service Can Proceed (after approval check)
// =============================================================================

export async function canServiceProceed(
  serviceType: NhisServiceType,
  serviceId: string,
  patientId: string,
): Promise<{
  canProceed: boolean;
  reason: string;
  approvalStatus?: NhisApprovalStatus;
}> {
  if (!isNhisFeatureEnabled()) {
    return {
      canProceed: true,
      reason: 'NHIS approval is disabled for this facility',
    };
  }

  // Check if patient is NHIS
  const isNhis = await isPatientNhis(patientId);

  if (!isNhis) {
    return {
      canProceed: true,
      reason: 'Non-NHIS patient - no approval required',
    };
  }

  // Get current approval status
  const approvalStatus = await getServiceApprovalStatus(serviceType, serviceId);

  if (!approvalStatus) {
    // No approval record - check if one should be created
    return {
      canProceed: false,
      reason: 'NHIS approval not initiated',
    };
  }

  switch (approvalStatus.status) {
    case 'approved':
    case 'not_required':
      return {
        canProceed: true,
        reason: 'NHIS approval granted',
        approvalStatus: approvalStatus.status,
      };
    case 'pending':
      return {
        canProceed: false,
        reason: 'Awaiting NHIS approval',
        approvalStatus: 'pending',
      };
    case 'rejected':
      return {
        canProceed: false,
        reason: `NHIS approval rejected: ${approvalStatus.rejectionReason || 'No reason provided'}`,
        approvalStatus: 'rejected',
      };
    case 'expired':
      return {
        canProceed: false,
        reason: 'NHIS approval has expired',
        approvalStatus: 'expired',
      };
    default:
      return {
        canProceed: false,
        reason: 'Unknown approval status',
      };
  }
}
