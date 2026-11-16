// =============================================================================
// NDC MEDICAL CENTRE EMR - Admissions API
// Supabase API functions for admission management
// =============================================================================

import { supabase } from '../../../api/supabaseClient';
import {
  createBillingOrder,
  autoVerifyNhisBillingOrder,
  getBillingOrderOutstandingAmount,
  getPatientOutstandingBalance,
} from '../../billing/api/billing-order.api';
import { createApprovalRequest } from '../../nhis/api/nhis.api';
import type {
  Admission,
  AdmissionStatus,
  ActiveAdmissionView,
  CreateAdmissionDTO,
  UpdateAdmissionDTO,
  DischargeAdmissionDTO,
} from '../../../types/database.types';

// =============================================================================
// TYPES
// =============================================================================

export interface PendingAdmissionRequest {
  id: string;
  request_number: string;
  patient_id: string;
  encounter_id: string;
  patient_name: string;
  emr_number: string;
  patient_phone?: string;
  patient_gender?: string;
  patient_dob?: string;
  requesting_doctor_id: string;
  requesting_doctor_name: string;
  clinical_reason: string;
  urgency: 'Routine' | 'Urgent' | 'Emergency';
  admission_type: 'Emergency' | 'Elective';
  level_of_care?: string;
  target_ward_id?: string;
  target_ward_name?: string;
  expected_duration?: string;
  special_requirements?: string;
  notes?: string;
  created_at: string;
  status: string;
}

export interface ConfirmAdmissionDTO {
  request_id: string;
  patient_id: string;
  encounter_id: string;
  facility_id: string;
  ward_id: string;
  bed_id: string;
  admission_type:
    | 'emergency'
    | 'elective'
    | 'transfer'
    | 'observation'
    | 'day_case';
  admitting_diagnosis: string;
  level_of_care?: string;
  special_requirements?: string;
  notes?: string;
  confirmed_by: string;
}

export interface BatchConfirmAdmissionsDTO {
  request_ids: string[];
  confirmations: {
    request_id: string;
    bed_id: string;
  }[];
  confirmed_by: string;
}

export interface BatchResultDTO {
  successful: string[];
  failed: { id: string; error: string }[];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const OPEN_BILLING_STATUSES = [
  'Pending',
  'Awaiting_Payment',
  'Partially_Paid',
];
const ACCOMMODATION_SERVICE_PREFIX = 'Inpatient Accommodation';

function toAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function isOpenBillingStatus(status: string | null | undefined): boolean {
  return !!status && OPEN_BILLING_STATUSES.includes(status);
}

export function calculateAdmissionBillableDays(
  admissionDate: string,
  effectiveEndAt: string | Date = new Date(),
): number {
  const startMs = new Date(admissionDate).getTime();
  const endMs =
    effectiveEndAt instanceof Date
      ? effectiveEndAt.getTime()
      : new Date(effectiveEndAt).getTime();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return 1;
  }

  const diffMs = Math.max(0, endMs - startMs);
  return Math.max(1, Math.ceil(diffMs / MS_PER_DAY));
}

function buildAccommodationServiceName(days: number, dailyRate: number): string {
  return `${ACCOMMODATION_SERVICE_PREFIX} (${days} day${days === 1 ? '' : 's'} @ ${dailyRate}/day)`;
}

interface AdmissionBillingContext {
  id: string;
  patient_id: string;
  encounter_id: string | null;
  admission_date: string;
  actual_discharge_date: string | null;
  current_ward: {
    name?: string | null;
    price?: number | null;
    nhis_price?: number | null;
    is_nhis_covered?: boolean | null;
    nhis_percentage?: number | null;
  } | null;
  current_bed: {
    bed_number?: string | null;
    bed_type?: string | null;
    daily_rate?: number | null;
  } | null;
  patient: {
    insurance_type?: string | null;
  } | null;
}

interface ExistingAccommodationItem {
  id: string;
  billing_order_id: string;
  quantity: number | null;
  gross_amount: number | null;
  nhis_payable: number | null;
  patient_payable: number | null;
  created_at: string;
}

export async function syncAdmissionAccommodationBilling(
  admissionId: string,
  effectiveEndAt: string | Date = new Date(),
) {
  const { data: admissionData, error: admissionError } = await supabase
    .from('admissions')
    .select(
      `
      id,
      patient_id,
      encounter_id,
      admission_date,
      actual_discharge_date,
      current_ward:wards(name, price, nhis_price, is_nhis_covered, nhis_percentage),
      current_bed:beds!admissions_current_bed_id_fkey(bed_number, bed_type, daily_rate),
      patient:patients(insurance_type)
    `,
    )
    .eq('id', admissionId)
    .single();

  if (admissionError) throw admissionError;

  const admission = admissionData as AdmissionBillingContext;
  const normalizedInsType = (admission.patient?.insurance_type || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();
  const isNhis =
    normalizedInsType.includes('nhis') ||
    normalizedInsType === 'dhml' ||
    normalizedInsType === 'gifship';

  let unitCost = toAmount(
    admission.current_bed?.daily_rate ?? admission.current_ward?.price,
  );
  let nhisCovered = false;
  let nhisPercentage = 0;
  let nhisPayablePerDay = 0;
  let patientPayablePerDay = unitCost;

  if (isNhis && admission.current_ward?.is_nhis_covered) {
    unitCost = toAmount(admission.current_ward.nhis_price ?? unitCost);
    nhisCovered = true;
    nhisPercentage = toAmount(admission.current_ward.nhis_percentage);
    nhisPayablePerDay = unitCost * (nhisPercentage / 100);
    patientPayablePerDay = unitCost - nhisPayablePerDay;
  }

  const totalBillableDays = calculateAdmissionBillableDays(
    admission.admission_date,
    admission.actual_discharge_date || effectiveEndAt,
  );

  // The initial admission bill already represents day 1.
  const additionalDaysRequired = Math.max(totalBillableDays - 1, 0);

  if (additionalDaysRequired <= 0 || unitCost <= 0) {
    return {
      action: 'noop' as const,
      patientId: admission.patient_id,
      totalBillableDays,
      additionalDaysRequired,
    };
  }

  const { data: existingItemsData, error: existingItemsError } = await supabase
    .from('billing_items')
    .select(
      'id, billing_order_id, quantity, gross_amount, nhis_payable, patient_payable, created_at',
    )
    .eq('service_reference_id', admissionId)
    .eq('item_type', 'Admission')
    .ilike('service_name', `${ACCOMMODATION_SERVICE_PREFIX}%`)
    .order('created_at', { ascending: false });

  if (existingItemsError) throw existingItemsError;

  const existingItems = (existingItemsData || []) as ExistingAccommodationItem[];
  const orderIds = [...new Set(existingItems.map((item) => item.billing_order_id))];

  const ordersById = new Map<
    string,
    {
      id: string;
      status: string;
      total_amount: number | null;
      net_amount: number | null;
      paid_amount: number | null;
      balance_amount: number | null;
      patient_payable: number | null;
      nhis_payable: number | null;
      nhis_covered: boolean | null;
    }
  >();

  if (orderIds.length > 0) {
    const { data: ordersData, error: ordersError } = await supabase
      .from('billing_orders')
      .select(
        'id, status, total_amount, net_amount, paid_amount, balance_amount, patient_payable, nhis_payable, nhis_covered',
      )
      .in('id', orderIds);

    if (ordersError) throw ordersError;

    (ordersData || []).forEach((order: any) => ordersById.set(order.id, order));
  }

  const finalizedDays = existingItems
    .filter((item) => !isOpenBillingStatus(ordersById.get(item.billing_order_id)?.status))
    .reduce((sum, item) => sum + toAmount(item.quantity), 0);

  const openItem = existingItems.find((item) =>
    isOpenBillingStatus(ordersById.get(item.billing_order_id)?.status),
  );

  const targetOpenDays = Math.max(additionalDaysRequired - finalizedDays, 0);

  if (openItem) {
    if (targetOpenDays <= 0) {
      return {
        action: 'noop' as const,
        patientId: admission.patient_id,
        totalBillableDays,
        additionalDaysRequired,
      };
    }

    const newGross = targetOpenDays * unitCost;
    const newNhisPayable = targetOpenDays * nhisPayablePerDay;
    const newPatientPayable = targetOpenDays * patientPayablePerDay;

    if (
      toAmount(openItem.quantity) === targetOpenDays &&
      toAmount(openItem.gross_amount) === newGross &&
      toAmount(openItem.patient_payable) === newPatientPayable &&
      toAmount(openItem.nhis_payable) === newNhisPayable
    ) {
      return {
        action: 'noop' as const,
        patientId: admission.patient_id,
        totalBillableDays,
        additionalDaysRequired,
      };
    }

    const order = ordersById.get(openItem.billing_order_id);
    if (!order) {
      throw new Error('Accommodation billing order not found');
    }

    await supabase
      .from('billing_items')
      .update({
        item_name: buildAccommodationServiceName(targetOpenDays, unitCost),
        service_name: buildAccommodationServiceName(targetOpenDays, unitCost),
        quantity: targetOpenDays,
        unit_price: unitCost,
        unit_cost: unitCost,
        total_price: newGross,
        gross_amount: newGross,
        nhis_covered: nhisCovered,
        nhis_percentage: nhisPercentage,
        nhis_payable: newNhisPayable,
        patient_payable: newPatientPayable,
      })
      .eq('id', openItem.id);

    const updatedOrderTotal =
      toAmount(order.total_amount) - toAmount(openItem.gross_amount) + newGross;
    const updatedOrderNet =
      toAmount(order.net_amount) - toAmount(openItem.gross_amount) + newGross;
    const updatedOrderNhis =
      toAmount(order.nhis_payable) - toAmount(openItem.nhis_payable) + newNhisPayable;
    const updatedOrderPatient =
      toAmount(order.patient_payable) -
      toAmount(openItem.patient_payable) +
      newPatientPayable;

    await supabase
      .from('billing_orders')
      .update({
        total_amount: updatedOrderTotal,
        net_amount: updatedOrderNet,
        nhis_payable: updatedOrderNhis,
        patient_payable: updatedOrderPatient,
        balance_amount: Math.max(updatedOrderPatient - toAmount(order.paid_amount), 0),
        nhis_covered: Boolean(order.nhis_covered) || nhisCovered,
        updated_at: new Date().toISOString(),
      })
      .eq('id', openItem.billing_order_id);

    if (
      (Boolean(order.nhis_covered) || nhisCovered) &&
      updatedOrderPatient <= 0 &&
      updatedOrderNhis >= updatedOrderTotal &&
      isOpenBillingStatus(order.status)
    ) {
      await autoVerifyNhisBillingOrder(openItem.billing_order_id);
    }

    return {
      action: 'updated' as const,
      patientId: admission.patient_id,
      totalBillableDays,
      additionalDaysRequired,
    };
  }

  if (targetOpenDays <= 0) {
    return {
      action: 'noop' as const,
      patientId: admission.patient_id,
      totalBillableDays,
      additionalDaysRequired,
    };
  }

  const grossAmount = targetOpenDays * unitCost;
  const nhisPayable = targetOpenDays * nhisPayablePerDay;
  const patientPayable = targetOpenDays * patientPayablePerDay;

  await createBillingOrder({
    patient_id: admission.patient_id,
    encounter_id: admission.encounter_id ?? undefined,
    visit_id: admission.encounter_id ?? undefined,
    source_module: 'admission',
    service_type: 'Admission',
    service_reference_id: admission.id,
    service_name: buildAccommodationServiceName(targetOpenDays, unitCost),
    unit_cost: unitCost,
    quantity: targetOpenDays,
    gross_amount: grossAmount,
    nhis_covered: nhisCovered,
    nhis_percentage: nhisPercentage,
    nhis_payable: nhisPayable,
    patient_payable: patientPayable,
  });

  return {
    action: 'created' as const,
    patientId: admission.patient_id,
    totalBillableDays,
    additionalDaysRequired,
  };
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get pending admission requests for in-patient module
 * These are admission requests created by doctors that need bed assignment
 */
export async function getPendingAdmissionRequests(): Promise<
  PendingAdmissionRequest[]
> {
  const { data, error } = await supabase
    .from('clinical_requests')
    .select(
      `
      id,
      request_number,
      patient_id,
      encounter_id,
      requesting_doctor_id,
      clinical_reason,
      urgency,
      admission_type,
      level_of_care,
      target_ward_id,
      expected_duration,
      special_requirements,
      notes,
      created_at,
      status,
      patient:patients(first_name, surname, emr_number, contact_phone, gender, date_of_birth),
      requesting_doctor:staff!clinical_requests_requesting_doctor_id_fkey(first_name, last_name),
      target_ward:wards(name)
    `,
    )
    .eq('request_type', 'Admission')
    .in('status', ['Pending', 'Under_Review'])
    .order('urgency', { ascending: true }) // Emergency first
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Transform the data
  return (data || []).map((req: any) => {
    const patient = Array.isArray(req.patient) ? req.patient[0] : req.patient;
    const doctor = Array.isArray(req.requesting_doctor)
      ? req.requesting_doctor[0]
      : req.requesting_doctor;
    const ward = Array.isArray(req.target_ward)
      ? req.target_ward[0]
      : req.target_ward;

    return {
      id: req.id,
      request_number: req.request_number,
      patient_id: req.patient_id,
      encounter_id: req.encounter_id,
      patient_name: patient
        ? `${patient.first_name} ${patient.surname}`
        : 'Unknown',
      emr_number: patient?.emr_number || '',
      patient_phone: patient?.contact_phone,
      patient_gender: patient?.gender,
      patient_dob: patient?.date_of_birth,
      requesting_doctor_id: req.requesting_doctor_id,
      requesting_doctor_name: doctor
        ? `Dr. ${doctor.first_name} ${doctor.last_name}`
        : 'Unknown',
      clinical_reason: req.clinical_reason,
      urgency: req.urgency,
      admission_type: req.admission_type,
      level_of_care: req.level_of_care,
      target_ward_id: req.target_ward_id,
      target_ward_name: ward?.name,
      expected_duration: req.expected_duration,
      special_requirements: req.special_requirements,
      notes: req.notes,
      created_at: req.created_at,
      status: req.status,
    };
  });
}

/**
 * Confirm an admission request - creates actual admission with bed assignment
 */
export async function confirmAdmissionRequest(
  dto: ConfirmAdmissionDTO,
): Promise<Admission> {
  // 1. Generate admission number
  const admissionNumber = `ADM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  // 2. Get the clinical request details for additional info
  const { data: request } = await supabase
    .from('clinical_requests')
    .select('*')
    .eq('id', dto.request_id)
    .single();

  // Map level_of_care to valid acuity_level values
  const mapToAcuityLevel = (
    levelOfCare?: string,
  ): 'low' | 'moderate' | 'high' | 'critical' => {
    if (!levelOfCare) return 'moderate';
    const lc = levelOfCare.toLowerCase();
    if (
      lc.includes('critical') ||
      lc.includes('icu') ||
      lc.includes('intensive')
    )
      return 'critical';
    if (lc.includes('high') || lc.includes('hdu')) return 'high';
    if (lc.includes('low') || lc.includes('minimal')) return 'low';
    return 'moderate';
  };

  // 3. Create the admission
  const { data: admission, error: admissionError } = await supabase
    .from('admissions')
    .insert({
      admission_number: admissionNumber,
      facility_id: dto.facility_id,
      patient_id: dto.patient_id,
      encounter_id: dto.encounter_id,
      current_ward_id: dto.ward_id,
      current_bed_id: dto.bed_id,
      admission_type: dto.admission_type,
      admitting_diagnosis: dto.admitting_diagnosis || 'Admission requested',
      admission_date: new Date().toISOString(),
      admission_status: 'admitted',
      acuity_level: mapToAcuityLevel(dto.level_of_care),
      notes: dto.special_requirements
        ? `Special Requirements: ${dto.special_requirements}\n\n${dto.notes || ''}`
        : dto.notes,
      admitting_doctor_id: request?.requesting_doctor_id,
      clinical_request_id: dto.request_id,
      created_by: dto.confirmed_by,
    })
    .select()
    .single();

  if (admissionError) throw admissionError;

  // 4. Update bed status to occupied
  await supabase
    .from('beds')
    .update({
      status: 'occupied',
      current_patient_id: dto.patient_id,
      current_admission_id: admission.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dto.bed_id);

  // 5. Update ward available beds count
  const { data: wardData } = await supabase
    .from('wards')
    .select('available_beds')
    .eq('id', dto.ward_id)
    .single();

  if (wardData) {
    await supabase
      .from('wards')
      .update({
        available_beds: Math.max((wardData.available_beds || 1) - 1, 0),
      })
      .eq('id', dto.ward_id);
  }

  // 6. Update patient status to In-Patient
  await supabase
    .from('patients')
    .update({ patient_status: 'In-Patient' })
    .eq('id', dto.patient_id);

  // 7. Update clinical request to Completed
  await supabase
    .from('clinical_requests')
    .update({
      status: 'Completed',
      admission_id: admission.id,
      reviewed_by: dto.confirmed_by,
      reviewed_at: new Date().toISOString(),
      review_notes: `Admission confirmed. Bed assigned: ${dto.bed_id}`,
    })
    .eq('id', dto.request_id);

  // 8. Create billing order for admission
  // Hoist billing variables for NHIS approval routing (step 9)
  let isNhis = false;
  let unitCost = 0;
  let nhisCovered = false;
  let nhisPercentage = 0;
  let wardName = 'Ward';

  try {
    // Fetch ward and bed pricing info
    const [wardResult, bedResult, patientResult] = await Promise.all([
      supabase
        .from('wards')
        .select('name, price, nhis_price, is_nhis_covered, nhis_percentage')
        .eq('id', dto.ward_id)
        .single(),
      supabase
        .from('beds')
        .select('bed_number, bed_type, daily_rate')
        .eq('id', dto.bed_id)
        .single(),
      supabase
        .from('patients')
        .select('insurance_type')
        .eq('id', dto.patient_id)
        .single(),
    ]);

    const ward = wardResult.data;
    const bed = bedResult.data;
    const patient = patientResult.data;

    // DHML = Defence Health Maintenance Limited — default HMO for Military NHIS, NOT a separate category
    const normalizedInsType = (patient?.insurance_type || '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .trim();
    isNhis =
      normalizedInsType.includes('nhis') ||
      normalizedInsType === 'dhml' ||
      normalizedInsType === 'gifship';

    // Use bed daily rate if available, otherwise use ward price
    unitCost = Number(bed?.daily_rate || ward?.price || 0);
    let nhisPayable = 0;
    let patientPayable = unitCost;
    wardName = ward?.name || 'Ward';

    if (isNhis && ward?.is_nhis_covered) {
      // For NHIS, use ward NHIS price (beds don't have separate NHIS pricing)
      unitCost = Number(ward.nhis_price || unitCost);
      nhisCovered = true;
      nhisPercentage = Number(ward.nhis_percentage || 0);
      nhisPayable = unitCost * (nhisPercentage / 100);
      patientPayable = unitCost - nhisPayable;
    }

    const bedInfo = bed ? `Bed ${bed.bed_number} (${bed.bed_type})` : 'Bed';

    await createBillingOrder({
      patient_id: dto.patient_id,
      visit_id: dto.encounter_id,
      encounter_id: dto.encounter_id,
      source_module: 'admission',
      service_type: 'Admission',
      service_name: `Inpatient Admission - ${wardName}`,
      service_description: `Admission to ${wardName}, ${bedInfo}. Diagnosis: ${dto.admitting_diagnosis || 'N/A'}`,
      service_reference_id: admission.id,
      unit_cost: unitCost,
      quantity: 1,
      gross_amount: unitCost,
      nhis_covered: nhisCovered,
      nhis_percentage: nhisPercentage,
      nhis_payable: nhisPayable,
      patient_payable: patientPayable,
    });

    // 8b. If NHIS covers 100%, auto-verify the billing order
    if (nhisCovered && nhisPercentage >= 100) {
      try {
        // Find the billing order we just created for this admission
        const { data: admBillingOrder } = await supabase
          .from('billing_orders')
          .select('id')
          .eq('encounter_id', dto.encounter_id)
          .eq('source_module', 'admission')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (admBillingOrder) {
          await autoVerifyNhisBillingOrder(admBillingOrder.id);
          console.log(
            '[Admissions] Auto-verified admission billing order (100% NHIS covered)',
          );
        }
      } catch (autoVerifyError) {
        console.error(
          '[Admissions] Failed to auto-verify admission billing:',
          autoVerifyError,
        );
      }
    }
  } catch (billingError) {
    console.error('Failed to create billing for admission:', billingError);
  }

  // 9. For NHIS patients: Route admission to NHIS approval queue
  if (isNhis) {
    try {
      await createApprovalRequest({
        service_request_id: admission.id,
        service_type: 'admission',
        encounter_id: dto.encounter_id,
        patient_id: dto.patient_id,
        service_name: `Inpatient Admission - ${wardName}`,
        estimated_cost: unitCost,
        requested_by: dto.confirmed_by,
        request_reason: dto.admitting_diagnosis || 'Admission requested',
        clinical_justification:
          dto.notes || dto.special_requirements || undefined,
      });
      console.log('[Admissions] NHIS admission approval request created');
    } catch (nhisError) {
      console.error(
        '[Admissions] Failed to create NHIS approval for admission:',
        nhisError,
      );
      // Don't block admission if NHIS approval creation fails — it can be manually created
    }
  }

  return admission;
}

/**
 * Batch confirm admission requests
 */
export async function batchConfirmAdmissionRequests(
  dto: BatchConfirmAdmissionsDTO,
): Promise<BatchResultDTO> {
  const results: BatchResultDTO = { successful: [], failed: [] };

  // Get all the requests first
  const { data: requests, error: fetchError } = await supabase
    .from('clinical_requests')
    .select('*')
    .in('id', dto.request_ids);

  if (fetchError) {
    return {
      successful: [],
      failed: dto.request_ids.map((id) => ({ id, error: fetchError.message })),
    };
  }

  for (const requestId of dto.request_ids) {
    try {
      const request = requests?.find((r) => r.id === requestId);
      if (!request) {
        results.failed.push({ id: requestId, error: 'Request not found' });
        continue;
      }

      const confirmation = dto.confirmations.find(
        (c) => c.request_id === requestId,
      );
      if (!confirmation) {
        results.failed.push({
          id: requestId,
          error: 'No bed assignment provided',
        });
        continue;
      }

      await confirmAdmissionRequest({
        request_id: requestId,
        patient_id: request.patient_id,
        encounter_id: request.encounter_id,
        facility_id: request.facility_id || '',
        ward_id: request.target_ward_id,
        bed_id: confirmation.bed_id,
        admission_type: (
          request.admission_type || 'elective'
        ).toLowerCase() as any,
        admitting_diagnosis: request.clinical_reason,
        level_of_care: request.level_of_care,
        special_requirements: request.special_requirements,
        notes: request.notes,
        confirmed_by: dto.confirmed_by,
      });

      results.successful.push(requestId);
    } catch (error) {
      results.failed.push({
        id: requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Get all active admissions for a facility
 */
export async function getActiveAdmissions(facilityId: string) {
  const { data, error } = await supabase
    .from('active_admissions_view')
    .select('*')
    .eq('facility_id', facilityId)
    .order('admission_date', { ascending: false });

  if (error) throw error;

  const admissions = (data || []) as ActiveAdmissionView[];
  const patientIds = [...new Set(admissions.map((item) => item.patient_id).filter(Boolean))];

  if (patientIds.length === 0) {
    return admissions;
  }

  const CLOSED_BILLING_STATUSES = [
    'Paid',
    'Paid_NHIS',
    'Paid_Retainership',
    'Waived',
    'Cancelled',
  ];

  const { data: billingRows, error: billingError } = await supabase
    .from('billing_orders')
    .select(
      'id, patient_id, total_amount, balance_amount, net_amount, paid_amount, patient_payable, nhis_covered, source_module, status',
    )
    .in('patient_id', patientIds)
    .not('status', 'in', `(${CLOSED_BILLING_STATUSES.join(',')})`);

  if (billingError) throw billingError;

  const pendingByPatient = new Map<
    string,
    { total: number; count: number }
  >();

  (billingRows || []).forEach((row: any) => {
    const patientId = row.patient_id as string | undefined;
    if (!patientId) return;

    const outstanding = getBillingOrderOutstandingAmount(row);
    if (outstanding <= 0) return;

    const current = pendingByPatient.get(patientId) || { total: 0, count: 0 };
    pendingByPatient.set(patientId, {
      total: current.total + outstanding,
      count: current.count + 1,
    });
  });

  return admissions.map((admission) => {
    const pending = pendingByPatient.get(admission.patient_id);
    return {
      ...admission,
      pending_bills_total: pending?.total || 0,
      pending_bills_count: pending?.count || 0,
    };
  }) as ActiveAdmissionView[];
}

/**
 * Get all admissions for a patient
 */
export async function getPatientAdmissions(patientId: string) {
  const { data, error } = await supabase
    .from('admissions')
    .select(
      `
      *,
      current_ward:wards(id, name, ward_type),
      current_bed:beds!admissions_current_bed_id_fkey(id, bed_number, bed_type),
      attending_physician:staff!admissions_attending_physician_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('patient_id', patientId)
    .order('admission_date', { ascending: false });

  if (error) throw error;
  return data as Admission[];
}

/**
 * Get a single admission by ID
 */
export async function getAdmissionById(admissionId: string) {
  const { data, error } = await supabase
    .from('admissions')
    .select(
      `
      *,
      patient:patients(*),
      current_ward:wards(id, name, ward_type, nurse_station_phone),
      current_bed:beds!admissions_current_bed_id_fkey(id, bed_number, bed_type, features),
      admitting_doctor:staff!admissions_admitting_doctor_id_fkey(id, first_name, last_name),
      attending_physician:staff!admissions_attending_physician_id_fkey(id, first_name, last_name),
      primary_nurse:staff!admissions_primary_nurse_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('id', admissionId)
    .single();

  if (error) throw error;
  return data as Admission;
}

/**
 * Get admission by admission number
 */
export async function getAdmissionByNumber(admissionNumber: string) {
  const { data, error } = await supabase
    .from('admissions')
    .select(
      `
      *,
      patient:patients(*),
      current_ward:wards(id, name, ward_type),
      current_bed:beds!admissions_current_bed_id_fkey(id, bed_number, bed_type)
    `,
    )
    .eq('admission_number', admissionNumber)
    .single();

  if (error) throw error;
  return data as Admission;
}

/**
 * Get admissions by ward
 */
export async function getAdmissionsByWard(wardId: string) {
  const { data, error } = await supabase
    .from('admissions')
    .select(
      `
      *,
      patient:patients(id, first_name, surname, emr_number, date_of_birth, gender),
      current_bed:beds!admissions_current_bed_id_fkey(id, bed_number, bed_type),
      attending_physician:staff!admissions_attending_physician_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('current_ward_id', wardId)
    .not('admission_status', 'in', '("discharged","transferred","deceased")')
    .order('current_bed_id');

  if (error) throw error;
  return data as Admission[];
}

/**
 * Get admissions by status
 */
export async function getAdmissionsByStatus(
  facilityId: string,
  status: AdmissionStatus,
) {
  const { data, error } = await supabase
    .from('admissions')
    .select(
      `
      *,
      patient:patients(id, first_name, surname, emr_number),
      current_ward:wards(id, name),
      current_bed:beds!admissions_current_bed_id_fkey(id, bed_number)
    `,
    )
    .eq('facility_id', facilityId)
    .eq('admission_status', status)
    .order('admission_date', { ascending: false });

  if (error) throw error;
  return data as Admission[];
}

/**
 * Get all admission history with optional status filter
 */
export async function getAdmissionHistory(
  facilityId: string,
  options?: {
    status?: AdmissionStatus | 'all';
    startDate?: string;
    endDate?: string;
    limit?: number;
  },
) {
  let query = supabase
    .from('admissions')
    .select(
      `
      *,
      patient:patients(id, first_name, surname, emr_number, date_of_birth, gender),
      current_ward:wards(id, name, ward_type),
      current_bed:beds!admissions_current_bed_id_fkey(id, bed_number, bed_type),
      attending_physician:staff!admissions_attending_physician_id_fkey(id, first_name, last_name),
      admitting_doctor:staff!admissions_admitting_doctor_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('facility_id', facilityId)
    .order('admission_date', { ascending: false });

  // Apply status filter
  if (options?.status && options.status !== 'all') {
    query = query.eq('admission_status', options.status);
  }

  // Apply date filters
  if (options?.startDate) {
    query = query.gte('admission_date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('admission_date', options.endDate);
  }

  // Apply limit
  if (options?.limit) {
    query = query.limit(options.limit);
  } else {
    query = query.limit(100); // Default limit
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Admission[];
}

/**
 * Get admissions pending discharge
 */
export async function getPendingDischarges(facilityId: string) {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('admissions')
    .select(
      `
      *,
      patient:patients(id, first_name, surname, emr_number),
      current_ward:wards(id, name),
      current_bed:beds!admissions_current_bed_id_fkey(id, bed_number),
      attending_physician:staff!admissions_attending_physician_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('facility_id', facilityId)
    .not('admission_status', 'in', '("discharged","transferred","deceased")')
    .lte('expected_discharge_date', today)
    .order('expected_discharge_date');

  if (error) throw error;
  return data as Admission[];
}

/**
 * Search admissions
 */
export async function searchAdmissions(facilityId: string, searchTerm: string) {
  const { data, error } = await supabase
    .from('admissions')
    .select(
      `
      *,
      patient:patients(id, first_name, surname, emr_number),
      current_ward:wards(id, name),
      current_bed:beds!admissions_current_bed_id_fkey(id, bed_number)
    `,
    )
    .eq('facility_id', facilityId)
    .or(
      `admission_number.ilike.%${searchTerm}%,admitting_diagnosis.ilike.%${searchTerm}%`,
    )
    .order('admission_date', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as Admission[];
}

/**
 * Check if patient has active admission
 */
export async function hasActiveAdmission(patientId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('admissions')
    .select('id')
    .eq('patient_id', patientId)
    .not('admission_status', 'in', '("discharged","transferred","deceased")')
    .limit(1);

  if (error) throw error;
  return data.length > 0;
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new admission
 */
export async function createAdmission(
  facilityId: string,
  admissionData: CreateAdmissionDTO,
  userId: string,
) {
  // First, generate admission number
  const { data: admissionNumber, error: numError } = await supabase.rpc(
    'generate_admission_number',
    { facility_code: 'ADM' },
  );

  if (numError) throw numError;

  const { data, error } = await supabase
    .from('admissions')
    .insert({
      facility_id: facilityId,
      admission_number: admissionNumber,
      patient_id: admissionData.patient_id,
      encounter_id: admissionData.encounter_id,
      admission_date: new Date().toISOString(),
      admission_type: admissionData.admission_type,
      admission_source: admissionData.admission_source,
      current_ward_id: admissionData.ward_id,
      current_bed_id: admissionData.bed_id,
      admitting_diagnosis: admissionData.admitting_diagnosis,
      admitting_diagnosis_icd10: admissionData.admitting_diagnosis_icd10,
      chief_complaint: admissionData.chief_complaint,
      reason_for_admission: admissionData.reason_for_admission,
      admitting_doctor_id: admissionData.admitting_doctor_id || userId,
      attending_physician_id: admissionData.attending_physician_id,
      acuity_level: admissionData.acuity_level,
      isolation_required: admissionData.isolation_required || false,
      isolation_type: admissionData.isolation_type,
      expected_discharge_date: admissionData.expected_discharge_date,
      notes: admissionData.notes,
      admission_status: 'admitted',
      created_by: userId,
    })
    .select(
      `
      *,
      patient:patients(*),
      current_ward:wards(id, name, ward_type, price, nhis_price, is_nhis_covered, nhis_percentage),
      current_bed:beds!admissions_current_bed_id_fkey(id, bed_number, bed_type, daily_rate)
    `,
    )
    .single();

  if (error) throw error;

  // Create billing order for admission
  try {
    const admission = data as Admission;
    const ward = admission.current_ward;
    const normalizedAdmInsType = (admission.patient?.insurance_type || '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .trim();
    const isNhis =
      normalizedAdmInsType.includes('nhis') ||
      normalizedAdmInsType === 'dhml' ||
      normalizedAdmInsType === 'gifship';

    // Determine price based on insurance status
    let unitCost = Number(admission.current_bed?.daily_rate || ward?.price || 0);
    let nhisCovered = false;
    let nhisPercentage = 0;
    let nhisPayable = 0;
    let patientPayable = unitCost;

    if (isNhis && ward?.is_nhis_covered) {
      unitCost = Number(ward.nhis_price || unitCost); // Use NHIS tariff if available
      nhisCovered = true;
      nhisPercentage = Number(ward.nhis_percentage || 0);
      nhisPayable = unitCost * (nhisPercentage / 100);
      patientPayable = unitCost - nhisPayable;
    }

    await createBillingOrder({
      patient_id: admission.patient_id,
      visit_id: admission.encounter_id ?? undefined,
      encounter_id: admission.encounter_id ?? undefined,
      source_module: 'admission',
      service_type: 'Admission',
      service_reference_id: admission.id,
      service_name: 'Inpatient Admission',
      service_description: `Admission to ${admission.current_ward?.name || 'Ward'} (Bed ${admission.current_bed?.bed_number || 'N/A'}) - ${admission.admission_number}`,
      unit_cost: unitCost,
      quantity: 1,
      gross_amount: unitCost,
      nhis_covered: nhisCovered,
      nhis_percentage: nhisPercentage,
      nhis_payable: nhisPayable,
      patient_payable: patientPayable,
    });
  } catch (billingError) {
    console.error(
      'Failed to create billing order for admission:',
      billingError,
    );
    // Continue without failing the admission creation
  }

  return data as Admission;
}

/**
 * Update an admission
 */
export async function updateAdmission(
  admissionId: string,
  updates: UpdateAdmissionDTO,
  userId: string,
) {
  const { data, error } = await supabase
    .from('admissions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', admissionId)
    .select(
      `
      *,
      patient:patients(*),
      current_ward:wards(id, name, ward_type),
      current_bed:beds!admissions_current_bed_id_fkey(id, bed_number, bed_type)
    `,
    )
    .single();

  if (error) throw error;
  return data as Admission;
}

/**
 * Update admission status
 */
export async function updateAdmissionStatus(
  admissionId: string,
  status: AdmissionStatus,
  userId: string,
) {
  const { data, error } = await supabase
    .from('admissions')
    .update({
      admission_status: status,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', admissionId)
    .select()
    .single();

  if (error) throw error;
  return data as Admission;
}

/**
 * Discharge a patient
 */
export async function dischargePatient(
  admissionId: string,
  dischargeData: DischargeAdmissionDTO,
  userId: string,
) {
  const billingSync = await syncAdmissionAccommodationBilling(
    admissionId,
    new Date().toISOString(),
  );

  if (dischargeData.discharge_type !== 'deceased') {
    const outstandingBalance = await getPatientOutstandingBalance(
      billingSync.patientId,
    );

    if (outstandingBalance > 0) {
      throw new Error(
        'Outstanding bills must be cleared before discharge can be finalized.',
      );
    }
  }

  const { data, error } = await supabase
    .from('admissions')
    .update({
      admission_status: 'discharged',
      actual_discharge_date: new Date().toISOString(),
      discharge_type: dischargeData.discharge_type,
      discharge_diagnosis: dischargeData.discharge_diagnosis,
      discharge_diagnosis_icd10: dischargeData.discharge_diagnosis_icd10,
      discharge_disposition: dischargeData.discharge_disposition,
      discharge_summary: dischargeData.discharge_summary,
      discharge_instructions: dischargeData.discharge_instructions,
      follow_up_appointments: dischargeData.follow_up_appointments || [],
      discharge_medications: dischargeData.discharge_medications || [],
      discharged_by: userId,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', admissionId)
    .select(
      `
      *,
      patient:patients(*),
      current_ward:wards(id, name, available_beds),
      current_bed:beds!admissions_current_bed_id_fkey(id, bed_number)
    `,
    )
    .single();

  if (error) throw error;

  // Perform post-discharge updates
  try {
    const updatePromises = [];

    // 1. Update the linked encounter to Completed if it exists
    if (data?.encounter_id) {
      updatePromises.push(
        supabase
          .from('visits')
          .update({
            status: 'Completed',
            end_time: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.encounter_id),
      );
    }

    // 2. Update bed status to available
    if (data?.current_bed_id) {
      updatePromises.push(
        supabase
          .from('beds')
          .update({
            status: 'available',
            current_patient_id: null,
            current_admission_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.current_bed_id),
      );
    }

    // 3. Update ward available beds count
    if (data?.current_ward_id) {
      const currentAvailable = data.current_ward?.available_beds || 0;
      updatePromises.push(
        supabase
          .from('wards')
          .update({
            available_beds: currentAvailable + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.current_ward_id),
      );
    }

    // 4. Update patient status
    if (data?.patient_id) {
      updatePromises.push(
        supabase
          .from('patients')
          .update({
            patient_status: 'Out-Patient', // Or maybe just leave as is? Typically Out-Patient after discharge
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.patient_id),
      );
    }

    await Promise.all(updatePromises);
  } catch (err) {
    console.error('Error during post-discharge cleanup:', err);
    // We don't throw here to ensure the admission is still considered discharged in UI
  }

  return data as Admission;
}

/**
 * Assign care team member
 */
export async function assignCareTeamMember(
  admissionId: string,
  userId: string,
  role: string,
  currentUserId: string,
) {
  // First get current care team
  const { data: admission } = await supabase
    .from('admissions')
    .select('care_team')
    .eq('id', admissionId)
    .single();

  const careTeam = admission?.care_team || [];
  const existingIndex = careTeam.findIndex(
    (m: { user_id: string }) => m.user_id === userId,
  );

  if (existingIndex >= 0) {
    // Update existing member's role
    careTeam[existingIndex].role = role;
  } else {
    // Add new member
    careTeam.push({
      user_id: userId,
      role,
      assigned_at: new Date().toISOString(),
    });
  }

  const { data, error } = await supabase
    .from('admissions')
    .update({
      care_team: careTeam,
      updated_at: new Date().toISOString(),
      updated_by: currentUserId,
    })
    .eq('id', admissionId)
    .select()
    .single();

  if (error) throw error;
  return data as Admission;
}

/**
 * Add alert to admission
 */
export async function addAdmissionAlert(
  admissionId: string,
  alertType: string,
  message: string,
  userId: string,
) {
  const { data: admission } = await supabase
    .from('admissions')
    .select('alerts')
    .eq('id', admissionId)
    .single();

  const alerts = admission?.alerts || [];
  alerts.push({
    type: alertType,
    message,
    created_at: new Date().toISOString(),
    created_by: userId,
  });

  const { data, error } = await supabase
    .from('admissions')
    .update({
      alerts,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', admissionId)
    .select()
    .single();

  if (error) throw error;
  return data as Admission;
}

/**
 * Get admission statistics for a facility
 */
export async function getAdmissionStatistics(facilityId: string) {
  const today = new Date();
  const startOfMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1,
  ).toISOString();
  const endOfMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).toISOString();

  // Get current active admissions
  const { data: activeAdmissions, error: activeError } = await supabase
    .from('admissions')
    .select('id, admission_status, acuity_level')
    .eq('facility_id', facilityId)
    .not('admission_status', 'in', '("discharged","transferred","deceased")');

  if (activeError) throw activeError;

  // Get admissions this month
  const { data: monthlyAdmissions, error: monthlyError } = await supabase
    .from('admissions')
    .select('id')
    .eq('facility_id', facilityId)
    .gte('admission_date', startOfMonth)
    .lte('admission_date', endOfMonth);

  if (monthlyError) throw monthlyError;

  // Get discharges this month
  const { data: monthlyDischarges, error: dischargeError } = await supabase
    .from('admissions')
    .select('id')
    .eq('facility_id', facilityId)
    .eq('admission_status', 'discharged')
    .gte('actual_discharge_date', startOfMonth)
    .lte('actual_discharge_date', endOfMonth);

  if (dischargeError) throw dischargeError;

  const statusCounts = {
    admitted: 0,
    critical: 0,
    stable: 0,
    improving: 0,
    under_observation: 0,
  };

  activeAdmissions.forEach((a) => {
    if (a.admission_status in statusCounts) {
      statusCounts[a.admission_status as keyof typeof statusCounts]++;
    }
  });

  const acuityCounts = {
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
  };

  activeAdmissions.forEach((a) => {
    if (a.acuity_level && a.acuity_level in acuityCounts) {
      acuityCounts[a.acuity_level as keyof typeof acuityCounts]++;
    }
  });

  return {
    totalActive: activeAdmissions.length,
    statusCounts,
    acuityCounts,
    monthlyAdmissions: monthlyAdmissions.length,
    monthlyDischarges: monthlyDischarges.length,
  };
}

/**
 * Get discharged admissions for a facility
 */
export async function getDischargedAdmissions(facilityId: string) {
  const { data, error } = await supabase
    .from('admissions')
    .select(
      `
      *,
      patient:patients(id, first_name, surname, emr_number),
      current_ward:wards(id, name),
      current_bed:beds!admissions_current_bed_id_fkey(id, bed_number),
      discharged_by_user:staff!admissions_discharged_by_fkey(id, first_name, last_name)
    `,
    )
    .eq('facility_id', facilityId)
    .in('admission_status', ['discharged', 'deceased', 'transferred'])
    .order('actual_discharge_date', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as Admission[];
}
