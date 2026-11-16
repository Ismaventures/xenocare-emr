import { supabase } from '../../../api/supabaseClient';
import { sanitizeFilterValue } from '../../../lib/filterSanitizer';
import {
  PrescriptionDTO,
  DrugDTO,
  DispenseDTO,
  UpdateDrugDTO,
  CreateDrugDTO,
  PrescriptionFilters,
  DrugFilters,
  PharmacyStats,
  PrescriptionStatus,
  // Batch-related DTOs
  DrugBatchDTO,
  CreateBatchDTO,
  UpdateBatchDTO,
  BatchFilters,
  DispensableBatch,
  BatchDispenseDTO,
  DispenseRecordWithBatchDTO,
  CreateStockMovementDTO,
  StockMovementDTO,
  PharmacyInventoryStats,
  NearExpiryDrug,
  ExpiredDrug,
  DrugInventorySummary,
} from '../dtos/pharmacy.dto';
import { validateEncounterForModification } from '../../../lib/encounter/validation';
import { Staff, DrugCatalogue } from '../../../types/database.types';
import { createBillingOrder } from '../../billing/api/billing-order.api';
import { calculateNhisServiceCoverage } from '../../billing/utils/coverage.utils';
import { requestDeduper, DedupeKeys } from '../../../lib/requestDeduplication';
import { createScopedLogger } from '../../../utils/logger';

const log = createScopedLogger('PharmacyAPI');

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
 * Check if payment has been verified for a prescription.
 * Looks up billing_items by service_reference_id and checks billing_order status.
 */
async function ensurePaymentVerified(prescriptionId: string): Promise<void> {
  // Find billing item linked to this prescription
  const { data: billingItem, error: itemError } = await supabase
    .from('billing_items')
    .select('billing_order_id')
    .eq('service_reference_id', prescriptionId)
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
      'Payment required. Please verify payment before dispensing medication.',
    );
  }
}

// NOTE: All FK joins removed - PostgREST schema cache doesn't detect relationships properly
// Patient, drug, and staff data are hydrated separately after fetching
const PRESCRIPTION_SELECT = `*`;

const PRESCRIPTION_DETAIL_SELECT = `*`;

// Revert to * - DTOs have complex field mappings that expect all columns
const DRUG_CATALOGUE_SELECT = `*`;

const STAFF_PROFILE_SELECT = `
  staff_id,
  first_name,
  last_name,
  email,
  phone,
  staff_category,
  role,
  department_id,
  department
`;

/**
 * Hydrate prescriptions with patient data
 * Workaround for PostgREST FK relationship detection issues
 */
async function hydratePrescriptionPatients(
  prescriptions: PrescriptionDTO[] = [],
): Promise<PrescriptionDTO[]> {
  if (!prescriptions.length) {
    return prescriptions;
  }

  // Get unique patient IDs
  const patientIds = Array.from(
    new Set(
      prescriptions
        .map((rx) => rx.patient_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (!patientIds.length) {
    return prescriptions;
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
    return prescriptions;
  }

  // Create lookup map
  const patientMap = new Map((patients || []).map((p) => [p.patient_id, p]));

  // Merge patient data into prescriptions
  return prescriptions.map((rx) => ({
    ...rx,
    patient: rx.patient_id
      ? patientMap.get(rx.patient_id) || rx.patient
      : rx.patient,
  })) as PrescriptionDTO[];
}

/**
 * Hydrate prescriptions with drug data from drug_catalogue
 * This is a workaround for PostgREST FK relationship detection issues
 */
async function hydratePrescriptionDrugs(
  prescriptions: PrescriptionDTO[] = [],
): Promise<PrescriptionDTO[]> {
  if (!prescriptions.length) {
    return prescriptions;
  }

  // Get unique drug IDs
  const drugIds = Array.from(
    new Set(
      prescriptions
        .map((rx) => rx.drug_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (!drugIds.length) {
    return prescriptions;
  }

  // Fetch all drug fields to satisfy DrugCatalogue interface
  const { data: drugs, error } = await supabase
    .from('drug_catalogue')
    .select(DRUG_CATALOGUE_SELECT)
    .in('id', drugIds);

  if (error) {
    log.error('Failed to fetch drug data:', error);
    return prescriptions;
  }

  // Create lookup map mapping database columns to expected interface shape
  const drugMap = new Map(
    (drugs || []).map((d) => [
      d.id,
      {
        drug_id: d.id,
        drug_code: d.code,
        drug_name: d.name,
        generic_name: d.name, // Use name as generic_name fallback
        brand_name: d.brand_name,
        category: d.category,
        drug_type: d.drug_type,
        formulation: d.formulation || d.drug_type,
        dosage_form: d.dosage_form,
        strength: d.strengths, // Map strengths to strength
        strengths: d.strengths,
        manufacturer: d.manufacturer,
        stock_quantity: d.stock_quantity ?? 0,
        quantity_in_stock: d.stock_quantity ?? 0,
        reorder_level: d.reorder_level ?? 0,
        unit_of_measure: d.unit_of_measure || 'unit',
        unit_cost: d.unit_price ?? d.unit_cost ?? 0,
        selling_price: d.unit_price ?? d.selling_price ?? 0,
        price: d.unit_price ?? d.selling_price ?? 0,
        is_nhis_covered: d.is_nhis_covered ?? false,
        nhis_eligible: d.nhis_eligible ?? d.is_nhis_covered ?? false,
        nhis_price: d.nhis_price,
        nhis_percentage: d.nhis_percentage ?? 0,
        supplier: undefined, // Not in drug_catalogue table
        batch_number: undefined, // Not in drug_catalogue table (in drug_batches)
        manufacturing_date: undefined, // Not in drug_catalogue table
        expiry_date: undefined, // Not in drug_catalogue table (in drug_batches)
        is_active: d.is_active ?? true,
        requires_prescription: d.requires_prescription ?? false,
        requires_nhis_authorization: d.requires_nhis_authorization ?? false,
        is_controlled: d.is_controlled ?? false,
        created_at: d.created_at,
        updated_at: d.updated_at,
      } as DrugDTO,
    ]),
  );

  // Merge drug data into prescriptions
  // Fallback: if drug hydration fails, use drug_name stored directly on the prescription row
  return prescriptions.map((rx) => {
    const hydratedDrug = rx.drug_id
      ? drugMap.get(rx.drug_id) || rx.drug
      : rx.drug;
    // If no hydrated drug but drug_name exists on prescription, create a minimal drug object
    if (!hydratedDrug && (rx as any).drug_name) {
      return {
        ...rx,
        drug: {
          drug_id: rx.drug_id || '',
          drug_name: (rx as any).drug_name,
          drug_code: '',
          name: (rx as any).drug_name,
        } as any,
      };
    }
    return {
      ...rx,
      drug: hydratedDrug,
    };
  });
}

async function hydratePrescriptionStaff(
  prescriptions: PrescriptionDTO[] = [],
): Promise<PrescriptionDTO[]> {
  if (!prescriptions.length) {
    return prescriptions;
  }

  const staffIds = Array.from(
    new Set(
      prescriptions
        .flatMap((rx) => [rx.prescribed_by, rx.dispensed_by])
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (!staffIds.length) {
    return prescriptions;
  }

  const { data: staffRows, error } = await supabase
    .from('staff')
    .select(STAFF_PROFILE_SELECT)
    .in('staff_id', staffIds);

  if (error) throw error;

  const staffMap = new Map<string, Partial<Staff>>();
  (staffRows || []).forEach((staff) => {
    if (staff.staff_id) {
      staffMap.set(staff.staff_id, staff as Partial<Staff>);
    }
  });

  return prescriptions.map((rx) => ({
    ...rx,
    doctor: rx.prescribed_by
      ? ((staffMap.get(rx.prescribed_by) as Staff | undefined) ?? rx.doctor)
      : rx.doctor,
    pharmacist: rx.dispensed_by
      ? ((staffMap.get(rx.dispensed_by) as Staff | undefined) ?? rx.pharmacist)
      : rx.pharmacist,
  }));
}

// =============================================================================
// API Functions - Prescriptions
// =============================================================================

/**
 * Get prescriptions with filters
 */
export async function getPrescriptions(filters: PrescriptionFilters = {}) {
  const {
    page = 1,
    limit = 10,
    status,
    patient_id,
    consultation_id,
    date_from,
    date_to,
    search,
    includeNhisPending = false, // Default: hide pending NHIS prescriptions from Pharmacy queue
  } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('prescriptions')
    .select(PRESCRIPTION_SELECT, { count: 'exact' })
    .eq('is_external', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter out pending NHIS prescriptions unless explicitly included
  // These prescriptions should only be visible in the NHIS Specialty Approval queue
  if (!includeNhisPending) {
    query = query.neq('nhis_approval_status', 'pending');
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (patient_id) {
    query = query.eq('patient_id', patient_id);
  }

  if (consultation_id) {
    query = query.eq('consultation_id', consultation_id);
  }

  if (date_from) {
    query = query.gte('created_at', date_from);
  }

  if (date_to) {
    query = query.lte('created_at', date_to);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  // Hydrate with patient, drug, and staff data
  let prescriptions = await hydratePrescriptionPatients(
    (data as PrescriptionDTO[]) || [],
  );
  prescriptions = await hydratePrescriptionDrugs(prescriptions);
  prescriptions = await hydratePrescriptionStaff(prescriptions);

  return {
    data: prescriptions,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * Get a single prescription
 */
export async function getPrescription(
  prescriptionId: string,
): Promise<PrescriptionDTO> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select(PRESCRIPTION_DETAIL_SELECT)
    .eq('prescription_id', prescriptionId)
    .single();

  if (error) throw error;

  // Hydrate with patient, drug, and staff data
  let [hydrated] = await hydratePrescriptionPatients([data as PrescriptionDTO]);
  [hydrated] = await hydratePrescriptionDrugs([hydrated]);
  [hydrated] = await hydratePrescriptionStaff([hydrated]);
  return hydrated;
}

/**
 * Dispense medication
 * Validates encounter is active before dispensing.
 */
export async function dispenseMedication(
  data: DispenseDTO,
): Promise<PrescriptionDTO> {
  const { prescription_id, quantity_to_dispense, notes } = data;

  // Get current prescription with encounter info
  const { data: prescription, error: fetchError } = await supabase
    .from('prescriptions')
    .select(PRESCRIPTION_SELECT)
    .eq('prescription_id', prescription_id)
    .single();

  if (fetchError) throw fetchError;

  // Verify payment before dispensing
  await ensurePaymentVerified(prescription_id);

  // Fetch drug stock separately
  let currentStock = 0;
  let drugName = (prescription as any).drug_name || 'this drug';
  if (prescription.drug_id) {
    const { data: drugData } = await supabase
      .from('drug_catalogue')
      .select('stock_quantity, name')
      .eq('id', prescription.drug_id)
      .single();
    currentStock = drugData?.stock_quantity || 0;
    if (drugData?.name) drugName = drugData.name;
  }

  // Validate encounter is active
  const encounterId = prescription.encounter_id || prescription.visit_id;
  if (encounterId) {
    await ensureEncounterActive(encounterId);
  }

  // Check stock - clear out-of-stock message
  if (currentStock <= 0) {
    throw new Error(
      `Drug OUT OF STOCK: "${drugName}" has no available stock. Cannot dispense.`,
    );
  }
  if (Number(quantity_to_dispense) > Number(currentStock)) {
    throw new Error(
      `Insufficient stock for "${drugName}". Requested: ${quantity_to_dispense}, Available: ${currentStock}`,
    );
  }

  // Check for expired batches - prevent dispensing expired drugs
  if (prescription.drug_id) {
    const { data: activeBatches } = await supabase
      .from('drug_batches')
      .select('batch_id, batch_number, expiry_date, quantity_remaining')
      .eq('drug_id', prescription.drug_id)
      .eq('status', 'active')
      .gt('quantity_remaining', 0);

    if (activeBatches && activeBatches.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const allExpired = activeBatches.every(
        (b) => new Date(b.expiry_date) <= today,
      );
      if (allExpired) {
        throw new Error(
          `Cannot dispense EXPIRED drug: "${drugName}". All available batches have expired. Please remove expired stock.`,
        );
      }
      // Warn if only near-expiry batches remain (within 30 days)
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const allNearExpiry = activeBatches.every(
        (b) => new Date(b.expiry_date) <= thirtyDaysFromNow,
      );
      if (allNearExpiry) {
        // Allow but log warning - the drug is near expiry
        log.warn(
          `Warning: All batches of "${drugName}" expire within 30 days`,
        );
      }
    }
  }

  // Get current user as pharmacist
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let pharmacistId = null;
  if (user) {
    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email)
      .single();
    pharmacistId = staffData?.id;
  }

  // Calculate new quantities
  const newDispensedQty =
    (prescription.quantity_dispensed || 0) + quantity_to_dispense;
  const newStatus: PrescriptionStatus =
    newDispensedQty >= prescription.quantity_prescribed
      ? 'Dispensed'
      : 'Partial';

  // Update prescription
  const { data: updatedPrescription, error: updateError } = await supabase
    .from('prescriptions')
    .update({
      quantity_dispensed: newDispensedQty,
      status: newStatus,
      dispensed_by: pharmacistId,
      dispensed_date: new Date().toISOString(),
      notes: notes || prescription.notes,
    })
    .eq('prescription_id', prescription_id)
    .select(PRESCRIPTION_SELECT)
    .single();

  if (updateError) throw updateError;

  const [hydrated] = await hydratePrescriptionStaff([
    updatedPrescription as PrescriptionDTO,
  ]);
  // Update drug inventory atomically (prevents race conditions)
  if (prescription.drug_id) {
    const { error: stockError } = await supabase.rpc('decrement_drug_stock', {
      p_drug_id: prescription.drug_id,
      p_quantity: quantity_to_dispense,
    });
    if (stockError) {
      // Fallback: direct UPDATE if RPC not in schema cache (PostgREST cache lag)
      log.warn(
        '[Pharmacy] RPC decrement_drug_stock failed, using direct UPDATE fallback:',
        stockError.message,
      );
      const { data: currentDrug } = await supabase
        .from('drug_catalogue')
        .select('stock_quantity')
        .eq('id', prescription.drug_id)
        .single();
      if (currentDrug) {
        const newQty = Math.max(
          (currentDrug.stock_quantity || 0) - quantity_to_dispense,
          0,
        );
        const { error: directError } = await supabase
          .from('drug_catalogue')
          .update({
            stock_quantity: newQty,
            updated_at: new Date().toISOString(),
          })
          .eq('id', prescription.drug_id);
        if (directError) {
          log.error(
            '[Pharmacy] Direct stock update also failed:',
            directError.message,
          );
        }
      }
    }
  }

  return hydrated;
}

/**
 * Cancel prescription
 */
export async function cancelPrescription(
  prescriptionId: string,
): Promise<PrescriptionDTO> {
  const { data, error } = await supabase
    .from('prescriptions')
    .update({ status: 'Cancelled' })
    .eq('prescription_id', prescriptionId)
    .select(PRESCRIPTION_SELECT)
    .single();

  if (error) throw error;
  const [hydrated] = await hydratePrescriptionStaff([data as PrescriptionDTO]);
  return hydrated;
}

/**
 * Delete prescription permanently (only for pending prescriptions)
 */
export async function deletePrescription(
  prescriptionId: string,
): Promise<void> {
  // First check if prescription is pending
  const { data: rx, error: fetchError } = await supabase
    .from('prescriptions')
    .select('status')
    .eq('prescription_id', prescriptionId)
    .single();

  if (fetchError) throw fetchError;

  if (rx?.status !== 'Pending') {
    throw new Error('Only pending prescriptions can be deleted');
  }

  // Delete associated billing items and orders first
  const { data: billingItem } = await supabase
    .from('billing_items')
    .select('billing_order_id')
    .eq('item_id', prescriptionId)
    .maybeSingle();

  if (billingItem?.billing_order_id) {
    // Delete billing items
    await supabase
      .from('billing_items')
      .delete()
      .eq('billing_order_id', billingItem.billing_order_id);

    // Delete billing order
    await supabase
      .from('billing_orders')
      .delete()
      .eq('id', billingItem.billing_order_id);
  }

  // Delete the prescription
  const { error } = await supabase
    .from('prescriptions')
    .delete()
    .eq('prescription_id', prescriptionId);

  if (error) throw error;
}

/**
 * Delete multiple prescriptions permanently (only pending ones)
 *
 * OPTIMIZED: Uses bulk .in() query instead of N sequential queries
 */
export async function deletePrescriptionsBatch(
  prescriptionIds: string[],
): Promise<{ deleted: number; skipped: number }> {
  if (prescriptionIds.length === 0) {
    return { deleted: 0, skipped: 0 };
  }

  // Pre-fetch all prescriptions to validate status
  const { data: prescriptions, error: fetchError } = await supabase
    .from('prescriptions')
    .select('prescription_id, status')
    .in('prescription_id', prescriptionIds);

  if (fetchError) {
    log.error(
      'Failed to fetch prescriptions for batch delete:',
      fetchError,
    );
    return { deleted: 0, skipped: prescriptionIds.length };
  }

  const prescriptionMap = new Map(
    prescriptions?.map((p) => [p.prescription_id, p.status]) || [],
  );
  const validIds: string[] = [];
  let skipped = 0;

  for (const id of prescriptionIds) {
    const status = prescriptionMap.get(id);
    if (!status) {
      log.warn(`Prescription ${id} not found`);
      skipped++;
    } else if (status !== 'Pending' && status !== 'Draft') {
      log.warn(`Cannot delete prescription ${id} with status: ${status}`);
      skipped++;
    } else {
      validIds.push(id);
    }
  }

  // Bulk delete all valid prescriptions
  if (validIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('prescriptions')
      .delete()
      .in('prescription_id', validIds);

    if (deleteError) {
      log.error('Failed to batch delete prescriptions:', deleteError);
      return { deleted: 0, skipped: prescriptionIds.length };
    }
  }

  return { deleted: validIds.length, skipped };
}

// =============================================================================
// API Functions - Drug Inventory
// =============================================================================

/**
 * Map database drug record to DTO
 */
function mapDrugToDTO(dbRecord: any): DrugDTO {
  return {
    drug_id: dbRecord.id || dbRecord.drug_id,
    drug_code: dbRecord.code || dbRecord.drug_code,
    drug_name: dbRecord.name || dbRecord.drug_name,
    generic_name: dbRecord.generic_name,
    brand_name: dbRecord.brand_name,
    category: dbRecord.category,
    drug_type: dbRecord.drug_type,
    formulation: dbRecord.formulation,
    dosage_form: dbRecord.dosage_form,
    strength: dbRecord.strength,
    strengths: dbRecord.strength || dbRecord.strengths,
    presentation: dbRecord.presentation,
    manufacturer: dbRecord.manufacturer,
    stock_quantity: dbRecord.stock_quantity ?? dbRecord.quantity_in_stock ?? 0,
    quantity_in_stock:
      dbRecord.stock_quantity ?? dbRecord.quantity_in_stock ?? 0,
    reorder_level: dbRecord.reorder_level ?? 10,
    unit_of_measure: dbRecord.unit_of_measure || 'Unit',
    unit_cost: dbRecord.unit_cost ?? dbRecord.unit_price ?? 0,
    selling_price: dbRecord.unit_price ?? dbRecord.selling_price ?? 0,
    price: dbRecord.unit_price ?? dbRecord.selling_price ?? 0,
    is_nhis_covered: dbRecord.is_nhis_covered ?? false,
    nhis_eligible: dbRecord.nhis_eligible ?? false,
    nhis_price: dbRecord.nhis_price,
    nhis_percentage: dbRecord.nhis_percentage ?? 0,
    supplier: dbRecord.supplier,
    batch_number: dbRecord.batch_number,
    manufacturing_date: dbRecord.manufacturing_date,
    expiry_date: dbRecord.expiry_date,
    is_active: dbRecord.is_active ?? true,
    requires_prescription: dbRecord.requires_prescription ?? false,
    is_controlled: dbRecord.is_controlled ?? false,
    created_at: dbRecord.created_at,
    updated_at: dbRecord.updated_at,
  };
}

/**
 * Get drugs with filters
 */
export async function getDrugs(filters: DrugFilters = {}) {
  const { page = 1, limit = 20, category, low_stock, search } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('drug_catalogue')
    .select('*', { count: 'exact' })
    .order('name') // Database column is 'name'
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq('category', category);
  }

  if (search) {
    // Search in both 'name' and 'code' columns
    const safeSearch = sanitizeFilterValue(search);
    query = query.or(
      `name.ilike.%${safeSearch}%,code.ilike.%${safeSearch}%,brand_name.ilike.%${safeSearch}%`,
    );
  }

  const { data, error, count } = await query;

  if (error) throw error;

  // Map database records to DTOs
  let mappedData = (data || []).map(mapDrugToDTO);

  // Filter low stock client-side
  if (low_stock) {
    mappedData = mappedData.filter(
      (d) => (d.quantity_in_stock ?? d.stock_quantity ?? 0) <= d.reorder_level,
    );
  }

  return {
    data: mappedData,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * Get a single drug
 */
export async function getDrug(drugId: string): Promise<DrugDTO> {
  const { data, error } = await supabase
    .from('drug_catalogue')
    .select(DRUG_CATALOGUE_SELECT)
    .eq('id', drugId)
    .single();

  if (error) throw error;
  return mapDrugToDTO(data);
}

/**
 * Create a new drug in the catalogue
 */
export async function createDrug(data: CreateDrugDTO): Promise<DrugDTO> {
  // Map DTO fields to database columns
  const dbData = {
    code: data.drug_code,
    name: data.drug_name,
    generic_name: data.generic_name || null,
    brand_name: data.brand_name || null,
    category: data.category,
    drug_type: data.drug_type,
    formulation: data.formulation || data.drug_type,
    dosage_form: data.dosage_form || null,
    strength: data.strength || null,
    manufacturer: data.manufacturer || null,
    unit_of_measure: data.unit_of_measure || 'Unit',
    unit_price: data.selling_price,
    unit_cost: data.unit_cost || data.selling_price,
    stock_quantity: 0, // Start with 0, batches will add stock
    reorder_level: data.reorder_level || 10,
    nhis_eligible: data.nhis_eligible || false,
    nhis_price: data.nhis_price || null,
    nhis_percentage: data.nhis_percentage || 0,
    requires_prescription: data.requires_prescription || false,
    is_controlled: data.is_controlled || false,
    is_active: data.is_active ?? true,
  };

  const { data: drug, error } = await supabase
    .from('drug_catalogue')
    .insert(dbData)
    .select()
    .single();

  if (error) throw error;

  // Map back to DTO format
  return {
    ...drug,
    drug_id: drug.id,
    drug_code: drug.code,
    drug_name: drug.name,
    selling_price: drug.unit_price,
    quantity_in_stock: drug.stock_quantity,
  } as DrugDTO;
}

/**
 * Update drug in catalogue
 */
export async function updateDrug(data: UpdateDrugDTO): Promise<DrugDTO> {
  const { drug_id, ...dtoFields } = data;

  // Map DTO fields to database columns
  const dbData: Record<string, any> = {};

  if (dtoFields.drug_code !== undefined) dbData.code = dtoFields.drug_code;
  if (dtoFields.drug_name !== undefined) dbData.name = dtoFields.drug_name;
  if (dtoFields.generic_name !== undefined)
    dbData.generic_name = dtoFields.generic_name;
  if (dtoFields.brand_name !== undefined)
    dbData.brand_name = dtoFields.brand_name;
  if (dtoFields.category !== undefined) dbData.category = dtoFields.category;
  if (dtoFields.drug_type !== undefined) dbData.drug_type = dtoFields.drug_type;
  if (dtoFields.formulation !== undefined)
    dbData.formulation = dtoFields.formulation;
  if (dtoFields.dosage_form !== undefined)
    dbData.dosage_form = dtoFields.dosage_form;
  if (dtoFields.strength !== undefined) dbData.strength = dtoFields.strength;
  if (dtoFields.manufacturer !== undefined)
    dbData.manufacturer = dtoFields.manufacturer;
  if (dtoFields.unit_of_measure !== undefined)
    dbData.unit_of_measure = dtoFields.unit_of_measure;
  if (dtoFields.selling_price !== undefined)
    dbData.unit_price = dtoFields.selling_price;
  if (dtoFields.unit_cost !== undefined) dbData.unit_cost = dtoFields.unit_cost;
  if (dtoFields.quantity_in_stock !== undefined)
    dbData.stock_quantity = dtoFields.quantity_in_stock;
  if (dtoFields.reorder_level !== undefined)
    dbData.reorder_level = dtoFields.reorder_level;
  if (dtoFields.nhis_eligible !== undefined)
    dbData.nhis_eligible = dtoFields.nhis_eligible;
  if (dtoFields.nhis_price !== undefined)
    dbData.nhis_price = dtoFields.nhis_price;
  if (dtoFields.nhis_percentage !== undefined)
    dbData.nhis_percentage = dtoFields.nhis_percentage;
  if (dtoFields.requires_prescription !== undefined)
    dbData.requires_prescription = dtoFields.requires_prescription;
  if (dtoFields.is_controlled !== undefined)
    dbData.is_controlled = dtoFields.is_controlled;
  if (dtoFields.is_active !== undefined) dbData.is_active = dtoFields.is_active;

  dbData.updated_at = new Date().toISOString();

  const { data: drug, error } = await supabase
    .from('drug_catalogue')
    .update(dbData)
    .eq('id', drug_id)
    .select()
    .single();

  if (error) throw error;

  // Map back to DTO format
  return {
    ...drug,
    drug_id: drug.id,
    drug_code: drug.code,
    drug_name: drug.name,
    selling_price: drug.unit_price,
    quantity_in_stock: drug.stock_quantity,
  } as DrugDTO;
}

/**
 * Restock drug
 */
export async function restockDrug(
  drugId: string,
  quantity: number,
): Promise<DrugDTO> {
  // Atomic increment prevents race conditions on concurrent restocks
  const { error: rpcError } = await supabase.rpc('increment_drug_stock', {
    p_drug_id: drugId,
    p_quantity: quantity,
  });
  if (rpcError) throw new Error(`Restock failed: ${rpcError.message}`);

  // Fetch updated drug record
  const { data: updated, error } = await supabase
    .from('drug_catalogue')
    .select()
    .eq('id', drugId)
    .single();

  if (error) throw error;
  // Map db column to DTO property
  return { ...updated, quantity_in_stock: updated.stock_quantity } as DrugDTO;
}

/**
 * Get low stock drugs
 */
export async function getLowStockDrugs(): Promise<DrugDTO[]> {
  const { data, error } = await supabase
    .from('drug_catalogue')
    .select(DRUG_CATALOGUE_SELECT)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;

  // Map to DTOs and filter for low stock
  return (data || [])
    .map(mapDrugToDTO)
    .filter(
      (d) => (d.quantity_in_stock ?? d.stock_quantity ?? 0) <= d.reorder_level,
    );
}

// =============================================================================
// API Functions - Statistics
// =============================================================================

/**
 * Get pharmacy statistics
 */
export async function getPharmacyStats(): Promise<PharmacyStats> {
  const today = new Date().toISOString().split('T')[0];

  // For stats, we'll fetch all prescriptions and count locally to avoid enum issues
  // This is more reliable than trying to filter by enum values via PostgREST
  const { data: allPrescriptions, error: prescError } = await supabase
    .from('prescriptions')
    .select('prescription_id, status, updated_at, is_external')
    .eq('is_external', false);

  if (prescError) {
    log.error(
      '[Pharmacy] Error fetching prescriptions:',
      prescError.message,
    );
  }

  // Count prescription stats locally
  let pending = 0;
  let awaitingPayment = 0;
  let partiallyDispensed = 0;
  let dispensedToday = 0;

  const todayDate = new Date(today);

  allPrescriptions?.forEach((rx) => {
    const { status } = rx;
    const updatedAt = rx.updated_at ? new Date(rx.updated_at) : null;
    const isToday = updatedAt && updatedAt >= todayDate;

    // Count non-dispensed, non-cancelled as pending
    if (status !== 'Dispensed' && status !== 'Cancelled') {
      pending++;
    }

    // Awaiting payment
    if (status === 'Awaiting_Payment' || status === 'Pending') {
      awaitingPayment++;
    }

    // Partially dispensed
    if (status === 'Partial') {
      partiallyDispensed++;
    }

    // Dispensed today
    if (status === 'Dispensed' && isToday) {
      dispensedToday++;
    }
  });

  // Low stock and out of stock - use correct column name 'name' not 'drug_name'
  const { data: drugs, error: drugsError } = await supabase
    .from('drug_catalogue')
    .select('id, name, stock_quantity, reorder_level')
    .eq('is_active', true);

  if (drugsError) {
    log.error(
      '[Pharmacy] Error fetching drugs for stock stats:',
      drugsError.message,
    );
  }

  let lowStock = 0;
  let outOfStock = 0;
  drugs?.forEach((d) => {
    const stockQty = d.stock_quantity ?? 0;
    const reorderLevel = d.reorder_level ?? 10; // Default reorder level if not set

    if (stockQty === 0) {
      outOfStock++;
    } else if (stockQty <= reorderLevel) {
      lowStock++;
    }
  });

  log.info('[Pharmacy Stats]', {
    pending_prescriptions: pending,
    awaiting_payment: awaitingPayment,
    dispensed_today: dispensedToday,
    low_stock_items: lowStock,
    out_of_stock: outOfStock,
    total_drugs: drugs?.length || 0,
    total_prescriptions: allPrescriptions?.length || 0,
  });

  return {
    pending_prescriptions: pending,
    awaiting_payment: awaitingPayment,
    partially_dispensed: partiallyDispensed,
    fully_dispensed_today: dispensedToday,
    dispensed_today: dispensedToday,
    low_stock_items: lowStock,
    out_of_stock: outOfStock,
  };
}

/**
 * Get pending prescriptions for a patient
 * Includes: Pending, Partial, Verified (paid but not dispensed), Paid
 */
export async function getPendingPrescriptions(patientId?: string) {
  let query = supabase
    .from('prescriptions')
    .select(PRESCRIPTION_SELECT)
    .eq('is_external', false)
    .or('status.eq.Pending,status.eq.Partial,status.eq.Verified,status.eq.Paid')
    .order('created_at', { ascending: true });

  if (patientId) {
    query = query.eq('patient_id', patientId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Hydrate patient, drug, and staff data
  let hydratedData = await hydratePrescriptionPatients(
    (data as PrescriptionDTO[]) || [],
  );
  hydratedData = await hydratePrescriptionDrugs(hydratedData);
  hydratedData = await hydratePrescriptionStaff(hydratedData);
  return hydratedData;
}

// =============================================================================
// BATCH-BASED INVENTORY API - FEFO Compliant
// =============================================================================

/**
 * Get all batches for a drug (or ALL batches if drugId omitted)
 */
export async function getDrugBatches(
  drugId: string | null,
  filters: BatchFilters = {},
): Promise<DrugBatchDTO[]> {
  let query = supabase
    .from('drug_batches')
    .select('*, drug_catalogue!inner(id, name, code, brand_name, strengths)')
    .order('expiry_date', { ascending: true });

  // Only filter by drug_id if provided
  if (drugId) {
    query = query.eq('drug_id', drugId);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.has_stock) {
    query = query.gt('quantity_remaining', 0);
  }

  if (filters.expired === true) {
    query = query.lte('expiry_date', new Date().toISOString().split('T')[0]);
  } else if (filters.expired === false) {
    query = query.gt('expiry_date', new Date().toISOString().split('T')[0]);
  }

  if (filters.expiring_within_days) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + filters.expiring_within_days);
    query = query.lte('expiry_date', futureDate.toISOString().split('T')[0]);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Compute derived fields
  const today = new Date();
  return (data || []).map((batch: any) => {
    const expiryDate = new Date(batch.expiry_date);
    const daysToExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    // Map drug_catalogue columns (name, code, strengths) to DTO fields (drug_name, drug_code, strength)
    const drugInfo = batch.drug_catalogue || {};
    return {
      ...batch,
      drug_catalogue: undefined,
      drug_name: drugInfo.name || '',
      drug_code: drugInfo.code || '',
      generic_name: drugInfo.brand_name || '',
      strength: drugInfo.strengths || '',
      days_to_expiry: daysToExpiry,
      is_expired: daysToExpiry <= 0,
      is_near_expiry: daysToExpiry > 0 && daysToExpiry <= 90,
    } as DrugBatchDTO;
  });
}

/**
 * Get a single batch
 */
export async function getBatch(batchId: string): Promise<DrugBatchDTO> {
  const { data, error } = await supabase
    .from('drug_batches')
    .select('*')
    .eq('batch_id', batchId)
    .single();

  if (error) throw error;

  const today = new Date();
  const expiryDate = new Date(data.expiry_date);
  const daysToExpiry = Math.ceil(
    (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    ...data,
    days_to_expiry: daysToExpiry,
    is_expired: daysToExpiry <= 0,
    is_near_expiry: daysToExpiry > 0 && daysToExpiry <= 90,
  } as DrugBatchDTO;
}

/**
 * Create a new drug batch (receive stock)
 */
export async function createBatch(data: CreateBatchDTO): Promise<DrugBatchDTO> {
  const { data: batch, error } = await supabase
    .from('drug_batches')
    .insert({
      ...data,
      quantity_remaining: data.quantity_received,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;

  // Create stock movement record
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let staffId = data.received_by;
  if (!staffId && user) {
    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email)
      .single();
    staffId = staffData?.id;
  }

  await createStockMovement({
    drug_id: data.drug_id,
    batch_id: batch.batch_id,
    movement_type: 'IN',
    quantity: data.quantity_received,
    reference_number: data.purchase_order_id,
    reason: `New batch received: ${data.batch_number}`,
    notes: data.notes,
    performed_by: staffId || 'system',
  });

  // Note: Clinical audit is for encounter-related actions
  // Stock movements provide the audit trail for inventory

  return batch as DrugBatchDTO;
}

/**
 * Create multiple batches in one operation (multi-drug stock-in)
 */
export async function createMultipleBatches(
  batchList: CreateBatchDTO[],
): Promise<{
  successful: DrugBatchDTO[];
  failed: { index: number; error: string }[];
}> {
  const successful: DrugBatchDTO[] = [];
  const failed: { index: number; error: string }[] = [];

  for (let i = 0; i < batchList.length; i++) {
    try {
      const result = await createBatch(batchList[i]);
      successful.push(result);
    } catch (err: any) {
      failed.push({
        index: i,
        error: err?.message || 'Unknown error',
      });
    }
  }

  return { successful, failed };
}

/**
 * Update batch information
 */
export async function updateBatch(data: UpdateBatchDTO): Promise<DrugBatchDTO> {
  const { batch_id, ...updateData } = data;

  // Get original for comparison
  const { data: original } = await supabase
    .from('drug_batches')
    .select('batch_id, quantity_remaining')
    .eq('batch_id', batch_id)
    .single();

  const { data: batch, error } = await supabase
    .from('drug_batches')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('batch_id', batch_id)
    .select()
    .single();

  if (error) throw error;

  // Note: For batch updates that affect quantity, use adjustBatchStock
  // which creates proper stock movement audit trail

  return batch as DrugBatchDTO;
}

/**
 * Get dispensable batches in FEFO order using database function
 */
export async function getDispensableBatches(
  drugId: string,
  quantity: number,
): Promise<DispensableBatch[]> {
  const { data, error } = await supabase.rpc('get_dispensable_batches', {
    p_drug_id: drugId,
    p_quantity: quantity,
  });

  if (error) {
    // Fallback to client-side FEFO if function doesn't exist
    log.warn(
      'FEFO function not available, using client-side fallback',
      error,
    );
    return getDispensableBatchesFallback(drugId, quantity);
  }

  return data as DispensableBatch[];
}

/**
 * Client-side FEFO fallback
 */
async function getDispensableBatchesFallback(
  drugId: string,
  quantity: number,
): Promise<DispensableBatch[]> {
  const batches = await getDrugBatches(drugId, {
    status: 'active',
    has_stock: true,
    expired: false,
  });

  // Sort by expiry date (FEFO)
  batches.sort(
    (a, b) =>
      new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime(),
  );

  const result: DispensableBatch[] = [];
  let remaining = quantity;

  for (const batch of batches) {
    if (remaining <= 0) break;

    const toTake = Math.min(batch.quantity_remaining, remaining);
    result.push({
      batch_id: batch.batch_id,
      batch_number: batch.batch_number,
      quantity_available: batch.quantity_remaining,
      quantity_to_take: toTake,
      expiry_date: batch.expiry_date,
      days_to_expiry: batch.days_to_expiry || 0,
      cost_price: batch.cost_price,
      selling_price: batch.selling_price,
    });
    remaining -= toTake;
  }

  return result;
}

/**
 * Get total available stock for a drug (from active, non-expired batches)
 */
export async function getDrugAvailableStock(drugId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_drug_available_stock', {
    p_drug_id: drugId,
  });

  if (error) {
    // Fallback
    const batches = await getDrugBatches(drugId, {
      status: 'active',
      has_stock: true,
      expired: false,
    });
    return batches.reduce((sum, b) => sum + b.quantity_remaining, 0);
  }

  return data as number;
}

/**
 * Check drug stock availability and expiry status for UI display
 */
export interface DrugStockStatus {
  drug_id: string;
  drug_name: string;
  stock_quantity: number;
  is_out_of_stock: boolean;
  is_expired: boolean;
  is_near_expiry: boolean;
  nearest_expiry_date: string | null;
  days_to_nearest_expiry: number | null;
}

export async function checkDrugStockStatus(
  drugId: string,
): Promise<DrugStockStatus> {
  // Get drug info
  const { data: drug } = await supabase
    .from('drug_catalogue')
    .select('id, name, stock_quantity')
    .eq('id', drugId)
    .single();

  const stockQty = drug?.stock_quantity ?? 0;
  const drugName = drug?.name || 'Unknown Drug';

  // Get active batches with stock
  const { data: batches } = await supabase
    .from('drug_batches')
    .select('batch_id, expiry_date, quantity_remaining')
    .eq('drug_id', drugId)
    .eq('status', 'active')
    .gt('quantity_remaining', 0)
    .order('expiry_date', { ascending: true });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  let isExpired = false;
  let isNearExpiry = false;
  let nearestExpiryDate: string | null = null;
  let daysToNearestExpiry: number | null = null;

  if (batches && batches.length > 0) {
    const allExpired = batches.every((b) => new Date(b.expiry_date) <= today);
    isExpired = allExpired;

    // Find nearest expiry among non-expired batches
    const nonExpired = batches.filter((b) => new Date(b.expiry_date) > today);
    if (nonExpired.length > 0) {
      nearestExpiryDate = nonExpired[0].expiry_date;
      const expiryDate = new Date(nonExpired[0].expiry_date);
      daysToNearestExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      isNearExpiry = daysToNearestExpiry <= 30;
    } else if (allExpired) {
      nearestExpiryDate = batches[batches.length - 1].expiry_date;
      daysToNearestExpiry = 0;
    }
  }

  return {
    drug_id: drugId,
    drug_name: drugName,
    stock_quantity: stockQty,
    is_out_of_stock: stockQty <= 0,
    is_expired: isExpired,
    is_near_expiry: isNearExpiry,
    nearest_expiry_date: nearestExpiryDate,
    days_to_nearest_expiry: daysToNearestExpiry,
  };
}

export async function checkBatchDrugStockStatuses(
  drugIds: string[],
): Promise<Map<string, DrugStockStatus>> {
  const statusMap = new Map<string, DrugStockStatus>();
  if (drugIds.length === 0) return statusMap;

  // Bulk fetch drugs
  const { data: drugs } = await supabase
    .from('drug_catalogue')
    .select('id, name, stock_quantity')
    .in('id', drugIds);

  // Bulk fetch active batches
  const { data: batches } = await supabase
    .from('drug_batches')
    .select('drug_id, expiry_date, quantity_remaining')
    .in('drug_id', drugIds)
    .eq('status', 'active')
    .gt('quantity_remaining', 0)
    .order('expiry_date', { ascending: true });

  const drugMap = new Map((drugs || []).map((d) => [d.id, d]));
  const batchesByDrug = new Map<string, typeof batches>();
  for (const batch of batches || []) {
    if (!batchesByDrug.has(batch.drug_id)) {
      batchesByDrug.set(batch.drug_id, []);
    }
    batchesByDrug.get(batch.drug_id)!.push(batch);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const drugId of drugIds) {
    const drug = drugMap.get(drugId);
    const drugBatches = batchesByDrug.get(drugId) || [];
    const stockQty = drug?.stock_quantity ?? 0;

    let isExpired = false;
    let isNearExpiry = false;
    let nearestExpiryDate: string | null = null;
    let daysToNearestExpiry: number | null = null;

    if (drugBatches.length > 0) {
      const allExpired = drugBatches.every(
        (b) => new Date(b.expiry_date) <= today,
      );
      isExpired = allExpired;

      const nonExpired = drugBatches.filter(
        (b) => new Date(b.expiry_date) > today,
      );
      if (nonExpired.length > 0) {
        nearestExpiryDate = nonExpired[0].expiry_date;
        const expiryDate = new Date(nonExpired[0].expiry_date);
        daysToNearestExpiry = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        isNearExpiry = daysToNearestExpiry <= 30;
      } else if (allExpired) {
        nearestExpiryDate = drugBatches[drugBatches.length - 1].expiry_date;
        daysToNearestExpiry = 0;
      }
    }

    statusMap.set(drugId, {
      drug_id: drugId,
      drug_name: drug?.name || 'Unknown Drug',
      stock_quantity: stockQty,
      is_out_of_stock: stockQty <= 0,
      is_expired: isExpired,
      is_near_expiry: isNearExpiry,
      nearest_expiry_date: nearestExpiryDate,
      days_to_nearest_expiry: daysToNearestExpiry,
    });
  }

  return statusMap;
}

/**
 * Dispense medication with batch tracking (FEFO)
 * Creates proper audit trail with encounter/patient linking
 */
export async function dispenseMedicationWithBatch(
  data: BatchDispenseDTO,
): Promise<DispenseRecordWithBatchDTO> {
  const {
    prescription_id,
    drug_id,
    patient_id,
    encounter_id,
    pharmacist_id,
    quantity_to_dispense,
    batch_allocations,
    is_substitution = false,
    original_drug_id,
    substitution_reason,
    nhis_claim_id,
    nhis_amount = 0,
    patient_copay = 0,
    counseling_provided = false,
    notes,
  } = data;

  // Validate encounter is active
  if (encounter_id) {
    await ensureEncounterActive(encounter_id);
  }

  // Check for drug stock and expiry before proceeding
  const { data: drugInfo } = await supabase
    .from('drug_catalogue')
    .select('name, stock_quantity')
    .eq('id', drug_id)
    .single();
  const drugDisplayName = drugInfo?.name || 'this drug';

  if (drugInfo && (drugInfo.stock_quantity ?? 0) <= 0) {
    throw new Error(
      `Drug OUT OF STOCK: "${drugDisplayName}" has no available stock. Cannot dispense.`,
    );
  }

  // Check for expired batches
  const { data: activeBatchesForExpiry } = await supabase
    .from('drug_batches')
    .select('batch_id, expiry_date, quantity_remaining')
    .eq('drug_id', drug_id)
    .eq('status', 'active')
    .gt('quantity_remaining', 0);

  if (activeBatchesForExpiry && activeBatchesForExpiry.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allExpired = activeBatchesForExpiry.every(
      (b) => new Date(b.expiry_date) <= today,
    );
    if (allExpired) {
      throw new Error(
        `Cannot dispense EXPIRED drug: "${drugDisplayName}". All available batches have expired.`,
      );
    }
  }

  // Get batch allocations (auto FEFO if not provided)
  let allocations = batch_allocations;
  if (!allocations || allocations.length === 0) {
    const dispensableBatches = await getDispensableBatches(
      drug_id,
      quantity_to_dispense,
    );
    if (dispensableBatches.length === 0) {
      throw new Error('Insufficient stock or no valid batches available');
    }
    allocations = dispensableBatches.map((b) => ({
      batch_id: b.batch_id,
      quantity: b.quantity_to_take,
    }));
  }

  // Validate total allocation matches requested quantity
  const totalAllocated = allocations.reduce((sum, a) => sum + a.quantity, 0);
  if (totalAllocated < quantity_to_dispense) {
    throw new Error(
      `Insufficient stock. Requested: ${quantity_to_dispense}, Available: ${totalAllocated}`,
    );
  }

  // Start transaction-like operations
  const dispenseRecords: DispenseRecordWithBatchDTO[] = [];

  for (const allocation of allocations) {
    if (allocation.quantity <= 0) continue;

    // Verify batch has enough stock
    const batch = await getBatch(allocation.batch_id);
    if (batch.quantity_remaining < allocation.quantity) {
      throw new Error(`Batch ${batch.batch_number} has insufficient stock`);
    }

    // Create dispense record
    const { data: dispenseRecord, error: dispenseError } = await supabase
      .from('dispense_records')
      .insert({
        prescription_id,
        patient_id,
        encounter_id,
        drug_id,
        batch_id: allocation.batch_id,
        quantity_dispensed: allocation.quantity,
        pharmacist_id,
        is_substitution,
        original_drug_id,
        substitution_reason,
        nhis_claim_id,
        nhis_amount,
        patient_copay,
        counseling_provided,
        notes,
        status: 'dispensed',
      })
      .select()
      .single();

    if (dispenseError) throw dispenseError;

    // Update batch quantity atomically (prevents race conditions)
    const { error: batchError } = await supabase.rpc('decrement_batch_stock', {
      p_batch_id: allocation.batch_id,
      p_quantity: allocation.quantity,
    });
    if (batchError)
      throw new Error(`Batch stock update failed: ${batchError.message}`);

    // Create stock movement (audit trail)
    await createStockMovement({
      drug_id,
      batch_id: allocation.batch_id,
      movement_type: 'OUT',
      quantity: allocation.quantity,
      encounter_id,
      patient_id,
      dispense_id: dispenseRecord.dispense_id,
      reason: `Dispensed for prescription ${prescription_id}`,
      notes,
      performed_by: pharmacist_id,
    });

    dispenseRecords.push(dispenseRecord as DispenseRecordWithBatchDTO);
  }

  // Update prescription status
  if (prescription_id) {
    const { data: prescription } = await supabase
      .from('prescriptions')
      .select('quantity_prescribed, quantity_dispensed')
      .eq('prescription_id', prescription_id)
      .single();

    if (prescription) {
      const newDispensedQty =
        (prescription.quantity_dispensed || 0) + quantity_to_dispense;
      const newStatus: PrescriptionStatus =
        newDispensedQty >= prescription.quantity_prescribed
          ? 'Dispensed'
          : 'Partial';

      await supabase
        .from('prescriptions')
        .update({
          quantity_dispensed: newDispensedQty,
          status: newStatus,
          dispensed_by: pharmacist_id,
          dispensed_date: new Date().toISOString(),
        })
        .eq('prescription_id', prescription_id);
    }
  }

  // Return the first dispense record (or combine if needed)
  return dispenseRecords[0];
}

/**
 * Create stock movement record (audit trail)
 */
export async function createStockMovement(
  data: CreateStockMovementDTO,
): Promise<StockMovementDTO> {
  const { data: movement, error } = await supabase
    .from('inventory_stock_movements')
    .insert({
      drug_id: data.drug_id,
      item_id: data.item_id,
      batch_id: data.batch_id,
      movement_type: data.movement_type,
      quantity: data.quantity,
      reference_number: data.reference_number,
      encounter_id: data.encounter_id,
      patient_id: data.patient_id,
      dispense_id: data.dispense_id,
      reason: data.reason,
      notes: data.notes,
      performed_by: data.performed_by,
      approved_by: data.approved_by,
    })
    .select()
    .single();

  if (error) throw error;
  return movement as StockMovementDTO;
}

/**
 * Get stock movements for a drug or batch
 */
export async function getStockMovements(filters: {
  drug_id?: string;
  batch_id?: string;
  encounter_id?: string;
  patient_id?: string;
  limit?: number;
}): Promise<StockMovementDTO[]> {
  let query = supabase
    .from('inventory_stock_movements')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.drug_id) {
    query = query.eq('drug_id', filters.drug_id);
  }
  if (filters.batch_id) {
    query = query.eq('batch_id', filters.batch_id);
  }
  if (filters.encounter_id) {
    query = query.eq('encounter_id', filters.encounter_id);
  }
  if (filters.patient_id) {
    query = query.eq('patient_id', filters.patient_id);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as StockMovementDTO[];
}

/**
 * Adjust stock (with reason and audit)
 */
export async function adjustBatchStock(
  batchId: string,
  newQuantity: number,
  reason: string,
  performedBy: string,
  approvedBy?: string,
): Promise<DrugBatchDTO> {
  const batch = await getBatch(batchId);
  const quantityDiff = newQuantity - batch.quantity_remaining;

  // Update batch
  const { data: updatedBatch, error } = await supabase
    .from('drug_batches')
    .update({
      quantity_remaining: newQuantity,
      status: newQuantity <= 0 ? 'depleted' : 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('batch_id', batchId)
    .select()
    .single();

  if (error) throw error;

  // Create adjustment movement (serves as audit trail)
  await createStockMovement({
    drug_id: batch.drug_id,
    batch_id: batchId,
    movement_type: 'ADJUSTMENT',
    quantity: Math.abs(quantityDiff),
    reason,
    notes: `Adjusted from ${batch.quantity_remaining} to ${newQuantity}. ${quantityDiff > 0 ? 'Increase' : 'Decrease'} of ${Math.abs(quantityDiff)}`,
    performed_by: performedBy,
    approved_by: approvedBy,
  });

  return updatedBatch as DrugBatchDTO;
}

// =============================================================================
// PHARMACY INVENTORY REPORTS & STATS
// =============================================================================

/**
 * Get comprehensive pharmacy inventory statistics
 */
export async function getPharmacyInventoryStats(): Promise<PharmacyInventoryStats> {
  const { data, error } = await supabase.rpc('get_pharmacy_inventory_stats');

  if (error) {
    // Fallback to manual calculation
    log.warn('Stats function not available, using fallback', error);
    return getPharmacyInventoryStatsFallback();
  }

  return data as PharmacyInventoryStats;
}

/**
 * Fallback stats calculation
 */
async function getPharmacyInventoryStatsFallback(): Promise<PharmacyInventoryStats> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);
  const in60Days = new Date(today);
  in60Days.setDate(in60Days.getDate() + 60);
  const in90Days = new Date(today);
  in90Days.setDate(in90Days.getDate() + 90);

  const [
    { count: totalDrugs },
    { count: totalBatches },
    { data: allBatches },
    { data: drugsWithStock },
    { data: allActiveDrugs },
    { data: drugsWithAnyBatch },
    { count: dispensedToday },
    { count: receivedToday },
  ] = await Promise.all([
    supabase
      .from('drug_catalogue')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('drug_batches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gt('quantity_remaining', 0),
    supabase
      .from('drug_batches')
      .select(
        'drug_id, expiry_date, quantity_remaining, cost_price, selling_price, status',
      )
      .eq('status', 'active')
      .gt('quantity_remaining', 0)
      .gt('expiry_date', todayStr),
    // Get drugs that have stock (from batches)
    supabase
      .from('drug_batches')
      .select('drug_id, quantity_remaining')
      .eq('status', 'active')
      .gt('quantity_remaining', 0)
      .gt('expiry_date', todayStr),
    // Get all active drugs with reorder level
    supabase
      .from('drug_catalogue')
      .select('id, reorder_level')
      .eq('is_active', true),
    // Get drugs that have ever had batches (to identify which should be stocked)
    supabase.from('drug_batches').select('drug_id'),
    supabase
      .from('dispense_records')
      .select('*', { count: 'exact', head: true })
      .gte('dispensed_at', todayStr),
    supabase
      .from('drug_batches')
      .select('*', { count: 'exact', head: true })
      .gte('received_date', todayStr),
  ]);

  let expiring30 = 0;
  let expiring60 = 0;
  let expiring90 = 0;
  let expired = 0;
  let totalCostValue = 0;
  let totalSellingValue = 0;

  (allBatches || []).forEach((b) => {
    const expiry = new Date(b.expiry_date);
    if (expiry <= today) expired++;
    else if (expiry <= in30Days) expiring30++;
    else if (expiry <= in60Days) expiring60++;
    else if (expiry <= in90Days) expiring90++;

    if (b.status === 'active' && expiry > today) {
      totalCostValue += (b.quantity_remaining || 0) * (b.cost_price || 0);
      totalSellingValue += (b.quantity_remaining || 0) * (b.selling_price || 0);
    }
  });

  // Calculate stock per drug from batches
  const stockByDrugId: Record<string, number> = {};
  (drugsWithStock || []).forEach((b: any) => {
    stockByDrugId[b.drug_id] =
      (stockByDrugId[b.drug_id] || 0) + (b.quantity_remaining || 0);
  });

  // Get set of drugs that have ever had batches (meaning they're tracked for inventory)
  const drugsWithBatchHistory = new Set<string>();
  (drugsWithAnyBatch || []).forEach((b: any) => {
    drugsWithBatchHistory.add(b.drug_id);
  });

  // Determine low stock and out of stock
  // Only count as "out of stock" if drug has ever had batches
  // This prevents marking drugs that were never stocked as "out of stock"
  let lowStock = 0;
  let outOfStock = 0;
  (allActiveDrugs || []).forEach((d: any) => {
    const totalStock = stockByDrugId[d.id] || 0;
    const reorderLevel = d.reorder_level || 0;
    const hasBeenStocked = drugsWithBatchHistory.has(d.id);

    if (totalStock === 0 && hasBeenStocked) {
      // Only count as out of stock if it HAS had batches before
      outOfStock++;
    } else if (totalStock > 0 && totalStock <= reorderLevel) {
      lowStock++;
    }
  });

  return {
    total_drugs: totalDrugs || 0,
    total_batches: totalBatches || 0,
    low_stock_count: lowStock,
    out_of_stock_count: outOfStock,
    expiring_30_days: expiring30,
    expiring_60_days: expiring60,
    expiring_90_days: expiring90,
    expired_batches: expired,
    total_stock_value_cost: totalCostValue,
    total_stock_value_selling: totalSellingValue,
    dispensed_today_count: dispensedToday || 0,
    received_today_count: receivedToday || 0,
  };
}

/**
 * Get near-expiry drugs (within 90 days)
 */
export async function getNearExpiryDrugs(
  daysAhead: number = 90,
): Promise<NearExpiryDrug[]> {
  const { data, error } = await supabase
    .from('v_near_expiry_drugs')
    .select('*')
    .order('expiry_date', { ascending: true });

  if (error) {
    // Fallback if view doesn't exist
    log.warn('Near expiry view not available', error);
    return getNearExpiryDrugsFallback(daysAhead);
  }

  return data as NearExpiryDrug[];
}

async function getNearExpiryDrugsFallback(
  daysAhead: number,
): Promise<NearExpiryDrug[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('drug_batches')
    .select(
      `
      batch_id,
      drug_id,
      batch_number,
      quantity_remaining,
      expiry_date,
      cost_price
    `,
    )
    .eq('status', 'active')
    .gt('quantity_remaining', 0)
    .gt('expiry_date', new Date().toISOString().split('T')[0])
    .lte('expiry_date', futureDate.toISOString().split('T')[0])
    .order('expiry_date', { ascending: true });

  if (error) throw error;

  // Fetch drug info separately
  const drugIds = [
    ...new Set((data || []).map((d: any) => d.drug_id).filter(Boolean)),
  ];
  const { data: drugs } = await supabase
    .from('drug_catalogue')
    .select('id, code, name, brand_name')
    .in('id', drugIds);

  const drugMap = new Map((drugs || []).map((d) => [d.id, d]));

  const today = new Date();
  return (data || []).map((item: any) => {
    const expiryDate = new Date(item.expiry_date);
    const daysToExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const drug = drugMap.get(item.drug_id);
    return {
      batch_id: item.batch_id,
      drug_id: item.drug_id,
      drug_code: drug?.code || '',
      drug_name: drug?.name || '',
      generic_name: drug?.brand_name,
      batch_number: item.batch_number,
      quantity_remaining: item.quantity_remaining,
      expiry_date: item.expiry_date,
      days_to_expiry: daysToExpiry,
      cost_price: item.cost_price,
      batch_value: item.quantity_remaining * item.cost_price,
      urgency_level:
        daysToExpiry <= 30
          ? 'critical'
          : daysToExpiry <= 60
            ? 'warning'
            : 'caution',
    } as NearExpiryDrug;
  });
}

/**
 * Get expired drugs
 */
export async function getExpiredDrugs(): Promise<ExpiredDrug[]> {
  const { data, error } = await supabase
    .from('v_expired_drugs')
    .select('*')
    .order('expiry_date', { ascending: false });

  if (error) {
    // Fallback
    return getExpiredDrugsFallback();
  }

  return data as ExpiredDrug[];
}

async function getExpiredDrugsFallback(): Promise<ExpiredDrug[]> {
  const { data, error } = await supabase
    .from('drug_batches')
    .select(
      `
      batch_id,
      drug_id,
      batch_number,
      quantity_remaining,
      expiry_date,
      cost_price,
      status
    `,
    )
    .gt('quantity_remaining', 0)
    .lte('expiry_date', new Date().toISOString().split('T')[0])
    .order('expiry_date', { ascending: false });

  if (error) throw error;

  // Fetch drug info separately
  const drugIds = [
    ...new Set((data || []).map((d: any) => d.drug_id).filter(Boolean)),
  ];
  const { data: drugs } = await supabase
    .from('drug_catalogue')
    .select('id, code, name, brand_name')
    .in('id', drugIds);

  const drugMap = new Map((drugs || []).map((d) => [d.id, d]));

  const today = new Date();
  return (data || []).map((item: any) => {
    const expiryDate = new Date(item.expiry_date);
    const daysExpired = Math.ceil(
      (today.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const drug = drugMap.get(item.drug_id);
    return {
      batch_id: item.batch_id,
      drug_id: item.drug_id,
      drug_code: drug?.code || '',
      drug_name: drug?.name || '',
      generic_name: drug?.brand_name,
      batch_number: item.batch_number,
      quantity_remaining: item.quantity_remaining,
      expiry_date: item.expiry_date,
      days_expired: daysExpired,
      cost_price: item.cost_price,
      loss_value: item.quantity_remaining * item.cost_price,
      status: item.status,
    } as ExpiredDrug;
  });
}

/**
 * Get drug inventory summary with batch aggregation
 */
export async function getDrugInventorySummary(
  filters: DrugFilters = {},
): Promise<{ data: DrugInventorySummary[]; total: number }> {
  const { page = 1, limit = 20, category, search, low_stock } = filters;
  const offset = (page - 1) * limit;

  // Try view first
  let query = supabase
    .from('v_drug_inventory_summary')
    .select('*', { count: 'exact' })
    .order('drug_name')
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq('category', category);
  }
  if (search) {
    const safeSearch = sanitizeFilterValue(search);
    query = query.or(
      `drug_name.ilike.%${safeSearch}%,drug_code.ilike.%${safeSearch}%`,
    );
  }
  if (low_stock) {
    query = query.in('stock_status', ['low_stock', 'out_of_stock']);
  }

  const { data, error, count } = await query;

  if (error) {
    log.warn('Inventory summary view not available', error);
    // Would need a more complex fallback here
    return { data: [], total: 0 };
  }

  return {
    data: data as DrugInventorySummary[],
    total: count || 0,
  };
}

/**
 * Write off expired batch
 */
export async function writeOffBatch(
  batchId: string,
  reason: string,
  performedBy: string,
  approvedBy: string,
): Promise<DrugBatchDTO> {
  const batch = await getBatch(batchId);

  // Mark batch as expired
  const { data: updatedBatch, error } = await supabase
    .from('drug_batches')
    .update({
      status: 'expired',
      quantity_remaining: 0,
      updated_at: new Date().toISOString(),
      notes: `${batch.notes || ''}\nWritten off: ${reason}`,
    })
    .eq('batch_id', batchId)
    .select()
    .single();

  if (error) throw error;

  // Create expired movement (serves as audit trail)
  await createStockMovement({
    drug_id: batch.drug_id,
    batch_id: batchId,
    movement_type: 'EXPIRED',
    quantity: batch.quantity_remaining,
    reason,
    notes: `Batch written off due to expiry. Original qty: ${batch.quantity_remaining}`,
    performed_by: performedBy,
    approved_by: approvedBy,
  });

  return updatedBatch as DrugBatchDTO;
}

/**
 * Return dispensed medication (reversal)
 */
export async function returnDispensedMedication(
  dispenseId: string,
  quantityReturned: number,
  reason: string,
  performedBy: string,
): Promise<void> {
  // Get dispense record
  const { data: dispense, error: fetchError } = await supabase
    .from('dispense_records')
    .select('*')
    .eq('dispense_id', dispenseId)
    .single();

  if (fetchError) throw fetchError;

  if (quantityReturned > dispense.quantity_dispensed) {
    throw new Error('Cannot return more than was dispensed');
  }

  // Update dispense record
  await supabase
    .from('dispense_records')
    .update({
      status: 'returned',
      notes: `${dispense.notes || ''}\nReturned: ${quantityReturned} units. Reason: ${reason}`,
      updated_at: new Date().toISOString(),
    })
    .eq('dispense_id', dispenseId);

  // Return stock to batch
  if (dispense.batch_id) {
    const batch = await getBatch(dispense.batch_id);
    await supabase
      .from('drug_batches')
      .update({
        quantity_remaining: batch.quantity_remaining + quantityReturned,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('batch_id', dispense.batch_id);
  }

  // Create return movement
  await createStockMovement({
    drug_id: dispense.drug_id,
    batch_id: dispense.batch_id,
    movement_type: 'RETURN',
    quantity: quantityReturned,
    encounter_id: dispense.encounter_id,
    patient_id: dispense.patient_id,
    dispense_id: dispenseId,
    reason,
    performed_by: performedBy,
  });

  // Update prescription if linked
  if (dispense.prescription_id) {
    const { data: prescription } = await supabase
      .from('prescriptions')
      .select('quantity_dispensed, quantity_prescribed')
      .eq('prescription_id', dispense.prescription_id)
      .single();

    if (prescription) {
      const newQty = Math.max(
        0,
        (prescription.quantity_dispensed || 0) - quantityReturned,
      );
      const newStatus: PrescriptionStatus =
        newQty === 0
          ? 'Pending'
          : newQty >= prescription.quantity_prescribed
            ? 'Dispensed'
            : 'Partial';

      await supabase
        .from('prescriptions')
        .update({
          quantity_dispensed: newQty,
          status: newStatus,
        })
        .eq('prescription_id', dispense.prescription_id);
    }
  }
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
// Accept/Reject Prescription (Approval Workflow)
// =============================================================================

export interface AcceptPrescriptionDTO {
  prescription_id: string;
  verification_notes?: string;
}

export interface RejectPrescriptionDTO {
  prescription_id: string;
  rejection_reason: string;
}

/**
 * Accept/approve a prescription and create billing order.
 * This is called when pharmacist reviews and approves a pending prescription.
 * Billing is ONLY created upon acceptance, not when the prescription is first ordered.
 */
export async function acceptPrescription(
  dto: AcceptPrescriptionDTO,
): Promise<PrescriptionDTO> {
  const { prescription_id, verification_notes } = dto;

  return requestDeduper.dedupe(
    DedupeKeys.acceptPrescription(prescription_id),
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

      // Get the prescription (without FK join - PostgREST doesn't detect the relationship)
      const { data: prescription, error: fetchError } = await supabase
        .from('prescriptions')
        .select(PRESCRIPTION_SELECT)
        .eq('prescription_id', prescription_id)
        .single();

      if (fetchError) throw fetchError;
      if (!prescription) throw new Error('Prescription not found');

      // Validate prescription is in Pending status
      if (prescription.status !== 'Pending') {
        throw new Error(
          `Cannot accept prescription with status: ${prescription.status}`,
        );
      }

      // Fetch drug catalogue data separately (workaround for PostgREST FK detection)
      if (!prescription.drug_id) {
        throw new Error('Drug ID not found on prescription');
      }

      const { data: drug, error: drugError } = await supabase
        .from('drug_catalogue')
        .select(DRUG_CATALOGUE_SELECT)
        .eq('id', prescription.drug_id)
        .single();

      if (drugError) throw drugError;
      if (!drug) {
        throw new Error('Drug details not found in catalogue');
      }

      // Resolve patient UUID for billing
      const patientUuid = await resolvePatientUuid(prescription.patient_id);

      // Get visit/encounter insurance info
      const encounterId = prescription.encounter_id || prescription.visit_id;
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

      // Update prescription status to Accepted (verified)
      const { data: updatedPrescription, error: updateError } = await supabase
        .from('prescriptions')
        .update({
          status: 'Accepted', // Use 'Accepted' for approved prescriptions
          verified_by: staffData?.id,
          verified_at: new Date().toISOString(),
          verification_notes: verification_notes || null,
          drug_interaction_checked: true,
          allergy_checked: true,
          updated_at: new Date().toISOString(),
        })
        .eq('prescription_id', prescription_id)
        .select(PRESCRIPTION_SELECT)
        .single();

      if (updateError) throw updateError;

      // Calculate pricing and NHIS
      // NHIS Price is the SINGLE SOURCE OF TRUTH for NHIS billing
      // Fallback priority: nhis_price > selling_price > unit_price > price
      const nhisPriceField =
        drug.nhis_price && drug.nhis_price > 0 ? drug.nhis_price : null;
      const sellingPrice =
        drug.selling_price && drug.selling_price > 0
          ? drug.selling_price
          : null;
      const unitPriceField =
        drug.unit_price && drug.unit_price > 0 ? drug.unit_price : null;
      const priceField = drug.price && drug.price > 0 ? drug.price : null;
      // Use NHIS price as primary, with fallback to other prices
      const regularPrice =
        nhisPriceField ?? sellingPrice ?? unitPriceField ?? priceField ?? 0;

      // Log pricing for debugging
      log.info('[Pharmacy Billing] Drug pricing:', {
        drug_id: drug.id,
        drug_name: drug.name,
        nhis_price: drug.nhis_price,
        selling_price: drug.selling_price,
        unit_price: drug.unit_price,
        price: drug.price,
        calculated_regularPrice: regularPrice,
        is_nhis_covered: drug.is_nhis_covered,
      });

      const quantity = prescription.quantity_prescribed || 1;

      // Calculate NHIS coverage using the proper coverage utility
      // NHIS price is the single source of truth
      const coverage = calculateNhisServiceCoverage({
        insuranceType,
        serviceType: 'Pharmacy',
        regularPrice,
        nhisPrice: drug.nhis_price,
        isServiceNhisCovered: drug.is_nhis_covered !== false,
        serviceNhisPercentage: drug.nhis_percentage,
        quantity,
      });

      // Create billing order NOW (upon acceptance)
      const serviceName = `Medication: ${drug.name} (Qty: ${quantity})`;
      await createBillingOrder({
        patient_id: patientUuid,
        encounter_id: encounterId || undefined,
        source_module: 'pharmacy',
        service_reference_id: prescription_id,
        service_code: drug.code || undefined,
        service_description: serviceName,
        service_name: serviceName,
        quantity,
        unit_price: coverage.grossAmount / quantity,
        unit_cost: coverage.grossAmount / quantity,
        gross_amount: coverage.grossAmount,
        service_type: 'Pharmacy',
        nhis_covered: coverage.isNhis && drug.is_nhis_covered !== false,
        nhis_percentage: coverage.nhisPercentage,
        nhis_payable: coverage.nhisPayable,
        patient_payable: coverage.patientPayable,
      });

      // Hydrate and return
      let hydratedPrescription = await hydratePrescriptionPatients([
        updatedPrescription as PrescriptionDTO,
      ]);
      hydratedPrescription =
        await hydratePrescriptionDrugs(hydratedPrescription);
      return hydratedPrescription[0];
    },
  );
}

/**
 * Reject a prescription.
 * No billing is created for rejected prescriptions.
 */
export async function rejectPrescription(
  dto: RejectPrescriptionDTO,
): Promise<PrescriptionDTO> {
  const { prescription_id, rejection_reason } = dto;

  return requestDeduper.dedupe(
    DedupeKeys.rejectPrescription(prescription_id),
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

      // Validate prescription exists and is pending
      const { data: prescription, error: fetchError } = await supabase
        .from('prescriptions')
        .select('status')
        .eq('prescription_id', prescription_id)
        .single();

      if (fetchError) throw fetchError;
      if (!prescription) throw new Error('Prescription not found');

      if (prescription.status !== 'Pending') {
        throw new Error(
          `Cannot reject prescription with status: ${prescription.status}`,
        );
      }

      // Update prescription status to Rejected
      const { data: updatedPrescription, error: updateError } = await supabase
        .from('prescriptions')
        .update({
          status: 'Rejected',
          verification_notes: `Rejected: ${rejection_reason}`,
          verified_by: staffData?.id,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('prescription_id', prescription_id)
        .select(PRESCRIPTION_SELECT)
        .single();

      if (updateError) throw updateError;

      // Hydrate and return - NO billing created for rejected prescriptions
      let hydratedPrescription = await hydratePrescriptionPatients([
        updatedPrescription as PrescriptionDTO,
      ]);
      hydratedPrescription =
        await hydratePrescriptionDrugs(hydratedPrescription);
      return hydratedPrescription[0];
    },
  );
}

// =============================================================================
// Batch Accept/Reject Functions
// =============================================================================

export interface BatchAcceptPrescriptionsDTO {
  prescription_ids: string[];
  verification_notes?: string;
}

export interface BatchRejectPrescriptionsDTO {
  prescription_ids: string[];
  rejection_reason: string;
}

export interface BatchResultDTO {
  successful: string[];
  failed: Array<{ id: string; error: string }>;
}

/**
 * Accept multiple prescriptions in a single operation.
 * Each prescription creates its own billing order.
 *
 * OPTIMIZED: Pre-fetches all data in bulk, then processes with Promise.allSettled
 */
export async function batchAcceptPrescriptions(
  dto: BatchAcceptPrescriptionsDTO,
): Promise<BatchResultDTO> {
  const { prescription_ids, verification_notes } = dto;
  const result: BatchResultDTO = { successful: [], failed: [] };

  if (prescription_ids.length === 0) {
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

  // Pre-fetch all prescriptions
  const { data: prescriptions, error: fetchError } = await supabase
    .from('prescriptions')
    .select(PRESCRIPTION_SELECT)
    .in('prescription_id', prescription_ids);

  if (fetchError) {
    for (const id of prescription_ids) {
      result.failed.push({ id, error: fetchError.message });
    }
    return result;
  }

  const prescriptionMap = new Map(
    prescriptions?.map((p) => [p.prescription_id, p]) || [],
  );

  // Collect drug IDs for bulk fetch
  const drugIds = [
    ...new Set(prescriptions?.map((p) => p.drug_id).filter(Boolean) || []),
  ];

  // Pre-fetch all drugs
  const { data: drugs } =
    drugIds.length > 0
      ? await supabase
          .from('drug_catalogue')
          .select(DRUG_CATALOGUE_SELECT)
          .in('id', drugIds)
      : { data: [] };

  const drugMap = new Map(drugs?.map((d) => [d.id, d]) || []);

  // Collect encounter IDs for bulk insurance fetch
  const encounterIds = [
    ...new Set(
      prescriptions?.map((p) => p.encounter_id || p.visit_id).filter(Boolean) ||
        [],
    ),
  ];

  // Pre-fetch all visit insurance info
  const { data: visits } =
    encounterIds.length > 0
      ? await supabase
          .from('visits')
          .select('id, insurance_type, payment_category')
          .in('id', encounterIds)
      : { data: [] };

  const visitMap = new Map(visits?.map((v) => [v.id, v]) || []);

  // Process each prescription
  const processingPromises = prescription_ids.map(
    async (
      prescription_id,
    ): Promise<{ id: string; success: boolean; error?: string }> => {
      try {
        const prescription = prescriptionMap.get(prescription_id);
        if (!prescription) {
          return {
            id: prescription_id,
            success: false,
            error: 'Prescription not found',
          };
        }

        if (prescription.status !== 'Pending') {
          return {
            id: prescription_id,
            success: false,
            error: `Cannot accept prescription with status: ${prescription.status}`,
          };
        }

        const drug = drugMap.get(prescription.drug_id);

        // Check stock availability - block approval if drug is out of stock
        if (drug) {
          const stockQty = drug.stock_quantity ?? 0;
          if (stockQty <= 0) {
            return {
              id: prescription_id,
              success: false,
              error: `Drug "${drug.name}" is OUT OF STOCK. Cannot approve prescription.`,
            };
          }
          if (stockQty < (prescription.quantity_prescribed || 1)) {
            return {
              id: prescription_id,
              success: false,
              error: `Insufficient stock for "${drug.name}". Available: ${stockQty}, Requested: ${prescription.quantity_prescribed}`,
            };
          }
        }

        const encounterId = prescription.encounter_id || prescription.visit_id;
        const visit = encounterId ? visitMap.get(encounterId) : null;
        const insuranceType =
          visit?.insurance_type || visit?.payment_category || '';

        // Update prescription status
        const { error: updateError } = await supabase
          .from('prescriptions')
          .update({
            status: 'Accepted',
            verified_by: staffData?.id,
            verified_at: new Date().toISOString(),
            verification_notes: verification_notes || null,
            drug_interaction_checked: true,
            allergy_checked: true,
            updated_at: new Date().toISOString(),
          })
          .eq('prescription_id', prescription_id);

        if (updateError) {
          return {
            id: prescription_id,
            success: false,
            error: updateError.message,
          };
        }

        // Calculate pricing - use drug catalogue data if available, fallback to prescription drug_name
        const drugName =
          drug?.name || (prescription as any).drug_name || 'Unknown Medication';
        const drugCode = drug?.code || '';
        const nhisPriceField =
          drug?.nhis_price && drug.nhis_price > 0 ? drug.nhis_price : null;
        const sellingPrice =
          drug?.selling_price && drug.selling_price > 0
            ? drug.selling_price
            : null;
        const unitPriceField =
          drug?.unit_price && drug.unit_price > 0 ? drug.unit_price : null;
        const priceField = drug?.price && drug.price > 0 ? drug.price : null;
        // Use NHIS price as primary, with fallback to other prices
        const regularPrice =
          nhisPriceField ?? sellingPrice ?? unitPriceField ?? priceField ?? 0;
        const quantity = prescription.quantity_prescribed || 1;

        // NHIS price is the single source of truth
        const coverage = calculateNhisServiceCoverage({
          insuranceType,
          serviceType: 'Pharmacy',
          regularPrice,
          nhisPrice: drug?.nhis_price,
          isServiceNhisCovered: drug?.is_nhis_covered !== false,
          serviceNhisPercentage: drug?.nhis_percentage,
          quantity,
        });

        const patientUuid = await resolvePatientUuid(prescription.patient_id);
        const serviceName = `Medication: ${drugName}${prescription.dosage ? ` (${prescription.dosage})` : ''}`;

        await createBillingOrder({
          patient_id: patientUuid,
          encounter_id: encounterId || undefined,
          source_module: 'pharmacy',
          service_reference_id: prescription_id,
          service_code: drugCode,
          service_description: serviceName,
          service_name: serviceName,
          quantity,
          unit_price: regularPrice,
          unit_cost: regularPrice,
          gross_amount: coverage.grossAmount,
          service_type: 'Pharmacy',
          nhis_covered: coverage.isNhis,
          nhis_percentage: coverage.nhisPercentage,
          nhis_payable: coverage.nhisPayable,
          patient_payable: coverage.patientPayable,
        });

        return { id: prescription_id, success: true };
      } catch (error) {
        return {
          id: prescription_id,
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
        result.successful.push(id);
      } else {
        result.failed.push({ id, error: error || 'Unknown error' });
      }
    } else {
      result.failed.push({
        id: 'unknown',
        error: outcome.reason?.message || 'Promise rejected',
      });
    }
  }

  return result;
}

/**
 * Reject multiple prescriptions in a single operation.
 * No billing is created for rejected prescriptions.
 *
 * OPTIMIZED: Uses bulk .in() query instead of N sequential queries
 */
export async function batchRejectPrescriptions(
  dto: BatchRejectPrescriptionsDTO,
): Promise<BatchResultDTO> {
  const { prescription_ids, rejection_reason } = dto;
  const result: BatchResultDTO = { successful: [], failed: [] };

  if (prescription_ids.length === 0) {
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

  // Pre-fetch all prescriptions to validate status
  const { data: existingPrescriptions, error: fetchError } = await supabase
    .from('prescriptions')
    .select('prescription_id, status')
    .in('prescription_id', prescription_ids);

  if (fetchError) {
    for (const id of prescription_ids) {
      result.failed.push({ id, error: fetchError.message });
    }
    return result;
  }

  // Separate valid from invalid prescriptions
  const prescriptionMap = new Map(
    existingPrescriptions?.map((p) => [p.prescription_id, p.status]) || [],
  );
  const validIds: string[] = [];

  for (const id of prescription_ids) {
    const status = prescriptionMap.get(id);
    if (!status) {
      result.failed.push({ id, error: 'Prescription not found' });
    } else if (status !== 'Pending') {
      result.failed.push({
        id,
        error: `Cannot reject prescription with status: ${status}`,
      });
    } else {
      validIds.push(id);
    }
  }

  // Bulk update all valid prescriptions
  if (validIds.length > 0) {
    const { error: updateError } = await supabase
      .from('prescriptions')
      .update({
        status: 'Rejected',
        rejected_by: staffData?.id,
        rejected_at: new Date().toISOString(),
        rejection_reason,
        updated_at: new Date().toISOString(),
      })
      .in('prescription_id', validIds);

    if (updateError) {
      for (const id of validIds) {
        result.failed.push({ id, error: updateError.message });
      }
    } else {
      result.successful = validIds;
    }
  }

  return result;
}

// =============================================================================
// PHARMACY FINANCIALS API
// =============================================================================

export interface PharmacyFinancialSummary {
  // Stock Valuation
  total_stock_cost: number;
  total_stock_selling: number;
  potential_profit: number;
  profit_margin_pct: number;
  // Per-drug breakdown
  stock_by_drug: StockValuationRow[];
  // Sales summary (from billing_items linked to pharmacy)
  total_sales_amount: number;
  total_sales_count: number;
  total_nhis_payable: number;
  total_patient_payable: number;
  sales_detail: PharmacySaleRow[];
  // Purchase summary (cost of goods received)
  total_purchase_cost: number;
  total_batches_received: number;
  total_units_received: number;
  // Monthly trends
  monthly_purchases: MonthlyFinancialRow[];
  // Drug Catalogue Stats
  catalogue_total_drugs: number;
  catalogue_nhis_covered: number;
  catalogue_low_stock: number;
  catalogue_out_of_stock: number;
}

export interface PharmacySaleRow {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  nhis_covered: boolean;
  nhis_percentage: number;
  nhis_payable: number;
  patient_payable: number;
  status: string;
  created_at: string;
  order_number: string;
  payment_method: string;
  patient_name: string;
  patient_id_display: string;
  insurance_type: string;
}

export interface StockValuationRow {
  drug_id: string;
  drug_name: string;
  drug_code: string;
  total_qty: number;
  batch_count: number;
  cost_value: number;
  selling_value: number;
  profit_margin: number;
  earliest_expiry: string | null;
  status: 'in_stock' | 'low_stock' | 'at_risk';
}

export interface MonthlyFinancialRow {
  month: string; // YYYY-MM
  label: string; // "Jan 2026"
  purchase_cost: number;
  units_received: number;
  batches_received: number;
}

/**
 * Get comprehensive pharmacy financial summary
 */
export async function getPharmacyFinancials(): Promise<PharmacyFinancialSummary> {
  // 1. Get ALL active batches with drug info for stock valuation
  const { data: batches, error: batchErr } = await supabase
    .from('drug_batches')
    .select(
      'drug_id, batch_number, quantity_received, quantity_remaining, cost_price, selling_price, status, expiry_date, received_date, created_at',
    )
    .eq('status', 'active')
    .gt('quantity_remaining', 0);

  if (batchErr) throw batchErr;

  // 2. Get drug names
  const drugIds = [
    ...new Set((batches || []).map((b) => b.drug_id).filter(Boolean)),
  ];
  const { data: drugs } = await supabase
    .from('drug_catalogue')
    .select('id, name, code, reorder_level')
    .in('id', drugIds.length > 0 ? drugIds : ['__none__']);

  const drugMap = new Map((drugs || []).map((d) => [d.id, d]));

  // 3. Get pharmacy-related billing items for sales data (with patient info)
  const { data: billingItems } = await supabase
    .from('billing_items')
    .select(
      `
      id, item_type, item_name, quantity, unit_price, total_price,
      nhis_covered, nhis_percentage, nhis_payable, patient_payable,
      status, created_at,
      billing_orders!inner(order_number, patient_id, status, payment_method, source_module,
        patients!inner(first_name, surname, patient_id, insurance_type))
    `,
    )
    .eq('item_type', 'Pharmacy')
    .eq('status', 'Paid');

  // 4. Get ALL batches (including depleted) for purchase history
  const { data: allBatches } = await supabase
    .from('drug_batches')
    .select(
      'drug_id, quantity_received, cost_price, selling_price, created_at, received_date',
    )
    .order('created_at', { ascending: false });

  // === COMPUTE STOCK VALUATION ===
  const stockMap: Record<
    string,
    {
      drug_id: string;
      drug_name: string;
      drug_code: string;
      total_qty: number;
      batch_count: number;
      cost_value: number;
      selling_value: number;
      earliest_expiry: string | null;
      reorder_level: number;
    }
  > = {};

  let totalStockCost = 0;
  let totalStockSelling = 0;

  (batches || []).forEach((b) => {
    const qty = b.quantity_remaining || 0;
    const cost = qty * (b.cost_price || 0);
    const sell = qty * (b.selling_price || 0);
    totalStockCost += cost;
    totalStockSelling += sell;

    const drug = drugMap.get(b.drug_id);
    if (!stockMap[b.drug_id]) {
      stockMap[b.drug_id] = {
        drug_id: b.drug_id,
        drug_name: drug?.name || 'Unknown',
        drug_code: drug?.code || '',
        total_qty: 0,
        batch_count: 0,
        cost_value: 0,
        selling_value: 0,
        earliest_expiry: null,
        reorder_level: drug?.reorder_level || 10,
      };
    }
    const entry = stockMap[b.drug_id];
    entry.total_qty += qty;
    entry.batch_count += 1;
    entry.cost_value += cost;
    entry.selling_value += sell;
    if (!entry.earliest_expiry || b.expiry_date < entry.earliest_expiry) {
      entry.earliest_expiry = b.expiry_date;
    }
  });

  const stockByDrug: StockValuationRow[] = Object.values(stockMap)
    .map((s) => ({
      drug_id: s.drug_id,
      drug_name: s.drug_name,
      drug_code: s.drug_code,
      total_qty: s.total_qty,
      batch_count: s.batch_count,
      cost_value: s.cost_value,
      selling_value: s.selling_value,
      profit_margin:
        s.selling_value > 0
          ? Math.round(
              ((s.selling_value - s.cost_value) / s.selling_value) * 100,
            )
          : 0,
      earliest_expiry: s.earliest_expiry,
      status: (s.total_qty === 0
        ? 'low_stock'
        : s.total_qty <= s.reorder_level
          ? 'at_risk'
          : 'in_stock') as 'in_stock' | 'low_stock' | 'at_risk',
    }))
    .sort((a, b) => b.selling_value - a.selling_value);

  const potentialProfit = totalStockSelling - totalStockCost;
  const profitMarginPct =
    totalStockSelling > 0
      ? Math.round((potentialProfit / totalStockSelling) * 100)
      : 0;

  // === COMPUTE SALES ===
  let totalSalesAmount = 0;
  let totalSalesCount = 0;
  let totalNhisPayable = 0;
  let totalPatientPayable = 0;
  const salesDetail: PharmacySaleRow[] = [];

  (billingItems || []).forEach((item: any) => {
    totalSalesAmount += item.total_price || 0;
    totalSalesCount += 1;
    totalNhisPayable += item.nhis_payable || 0;
    totalPatientPayable += item.patient_payable || 0;

    const bo = item.billing_orders;
    const pt = bo?.patients;
    salesDetail.push({
      id: item.id,
      item_name: item.item_name || '',
      quantity: item.quantity || 0,
      unit_price: item.unit_price || 0,
      total_price: item.total_price || 0,
      nhis_covered: item.nhis_covered || false,
      nhis_percentage: item.nhis_percentage || 0,
      nhis_payable: item.nhis_payable || 0,
      patient_payable: item.patient_payable || 0,
      status: item.status || '',
      created_at: item.created_at || '',
      order_number: bo?.order_number || '',
      payment_method: bo?.payment_method || '',
      patient_name: pt
        ? `${pt.first_name || ''} ${pt.surname || ''}`.trim()
        : 'Unknown',
      patient_id_display: pt?.patient_id || '',
      insurance_type: pt?.insurance_type || '',
    });
  });

  // Sort sales by date descending
  salesDetail.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // === COMPUTE DRUG CATALOGUE STATS ===
  const { count: catalogueTotalDrugs } = await supabase
    .from('drug_catalogue')
    .select('id', { count: 'exact', head: true });

  const { count: catalogueNhisCovered } = await supabase
    .from('drug_catalogue')
    .select('id', { count: 'exact', head: true })
    .eq('nhis_eligible', true);

  const { data: allCatDrugs } = await supabase
    .from('drug_catalogue')
    .select('stock_quantity, reorder_level');

  let catalogueLowStock = 0;
  let catalogueOutOfStock = 0;
  (allCatDrugs || []).forEach((d: any) => {
    const qty = d.stock_quantity ?? 0;
    const reorder = d.reorder_level ?? 10;
    if (qty === 0) catalogueOutOfStock++;
    else if (qty <= reorder) catalogueLowStock++;
  });

  // === COMPUTE PURCHASE HISTORY ===
  let totalPurchaseCost = 0;
  let totalBatchesReceived = 0;
  let totalUnitsReceived = 0;
  const monthlyMap: Record<string, MonthlyFinancialRow> = {};

  (allBatches || []).forEach((b) => {
    const cost = (b.quantity_received || 0) * (b.cost_price || 0);
    totalPurchaseCost += cost;
    totalBatchesReceived += 1;
    totalUnitsReceived += b.quantity_received || 0;

    // Monthly aggregation
    const dateStr = b.received_date || b.created_at;
    if (dateStr) {
      const d = new Date(dateStr);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthKey,
          label,
          purchase_cost: 0,
          units_received: 0,
          batches_received: 0,
        };
      }
      monthlyMap[monthKey].purchase_cost += cost;
      monthlyMap[monthKey].units_received += b.quantity_received || 0;
      monthlyMap[monthKey].batches_received += 1;
    }
  });

  const monthlyPurchases = Object.values(monthlyMap).sort((a, b) =>
    b.month.localeCompare(a.month),
  );

  return {
    total_stock_cost: totalStockCost,
    total_stock_selling: totalStockSelling,
    potential_profit: potentialProfit,
    profit_margin_pct: profitMarginPct,
    stock_by_drug: stockByDrug,
    total_sales_amount: totalSalesAmount,
    total_sales_count: totalSalesCount,
    total_nhis_payable: totalNhisPayable,
    total_patient_payable: totalPatientPayable,
    sales_detail: salesDetail,
    total_purchase_cost: totalPurchaseCost,
    total_batches_received: totalBatchesReceived,
    total_units_received: totalUnitsReceived,
    monthly_purchases: monthlyPurchases,
    catalogue_total_drugs: catalogueTotalDrugs || 0,
    catalogue_nhis_covered: catalogueNhisCovered || 0,
    catalogue_low_stock: catalogueLowStock,
    catalogue_out_of_stock: catalogueOutOfStock,
  };
}

// =============================================================================
// Pharmacy Audit Trail
// =============================================================================

export interface PharmacyAuditEntry {
  id: string;
  event_type:
    | 'stock_movement'
    | 'price_change'
    | 'batch_update'
    | 'drug_update';
  action: string;
  description: string;
  entity_name: string;
  old_value?: string;
  new_value?: string;
  performed_by: string;
  performer_name: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Get pharmacy audit trail from stock_movements, service_price_audit, and batch changes
 */
export async function getPharmacyAuditTrail(
  limit = 200,
): Promise<PharmacyAuditEntry[]> {
  const entries: PharmacyAuditEntry[] = [];

  // 1. Stock movements (IN, OUT, ADJUSTMENT, WRITE_OFF, DISPENSE)
  const { data: movements } = await supabase
    .from('inventory_stock_movements')
    .select(
      'movement_id, drug_id, batch_id, movement_type, quantity, reason, notes, performed_by, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  // Get drug names for movements
  const movDrugIds = [
    ...new Set((movements || []).map((m) => m.drug_id).filter(Boolean)),
  ];
  const { data: movDrugs } = await supabase
    .from('drug_catalogue')
    .select('id, name, code')
    .in('id', movDrugIds.length > 0 ? movDrugIds : ['__none__']);
  const movDrugMap = new Map((movDrugs || []).map((d) => [d.id, d]));

  // Get performer names
  const allPerformerIds = [
    ...(movements || []).map((m) => m.performed_by),
  ].filter(Boolean);

  // 2. Price changes from service_price_audit
  const { data: priceAudits } = await supabase
    .from('service_price_audit')
    .select(
      'id, service_type, service_id, service_name, field_changed, old_value, new_value, changed_by, changed_at, reason',
    )
    .in('service_type', ['Pharmacy', 'Drug', 'Medication', 'drug_catalogue'])
    .order('changed_at', { ascending: false })
    .limit(limit);

  // Also get ALL price audits for any drug-related items
  const { data: allPriceAudits } = await supabase
    .from('service_price_audit')
    .select(
      'id, service_type, service_id, service_name, field_changed, old_value, new_value, changed_by, changed_at, reason',
    )
    .order('changed_at', { ascending: false })
    .limit(limit);

  // Merge price audits by checking service_name containing drug-related keywords
  const pharmacyPriceAudits = [
    ...(priceAudits || []),
    ...(allPriceAudits || []).filter(
      (a) =>
        !priceAudits?.some((p) => p.id === a.id) &&
        (a.service_name?.toLowerCase().includes('medication') ||
          a.service_name?.toLowerCase().includes('drug') ||
          a.service_type === 'drug_catalogue'),
    ),
  ];

  const priceChangerIds = pharmacyPriceAudits
    .map((a) => a.changed_by)
    .filter(Boolean);
  const allUserIds = [...new Set([...allPerformerIds, ...priceChangerIds])];

  // Resolve staff names
  const { data: staffUsers } = await supabase
    .from('staff')
    .select('id, user_id, first_name, last_name')
    .in('user_id', allUserIds.length > 0 ? allUserIds : ['__none__']);
  const staffByUserId = new Map((staffUsers || []).map((s) => [s.user_id, s]));

  // Also try by staff ID
  const { data: staffById } = await supabase
    .from('staff')
    .select('id, user_id, first_name, last_name')
    .in('id', allUserIds.length > 0 ? allUserIds : ['__none__']);
  const staffByIdMap = new Map((staffById || []).map((s) => [s.id, s]));

  const getPerformerName = (id: string | null): string => {
    if (!id) return 'System';
    const byUser = staffByUserId.get(id);
    if (byUser)
      return `${byUser.first_name || ''} ${byUser.last_name || ''}`.trim();
    const byId = staffByIdMap.get(id);
    if (byId) return `${byId.first_name || ''} ${byId.last_name || ''}`.trim();
    return `${id.substring(0, 8)}...`;
  };

  // Build entries from stock movements
  (movements || []).forEach((m) => {
    const drug = movDrugMap.get(m.drug_id);
    const typeLabels: Record<string, string> = {
      IN: 'Stock Received',
      OUT: 'Stock Dispensed',
      ADJUSTMENT: 'Stock Adjusted',
      WRITE_OFF: 'Stock Written Off',
      DISPENSE: 'Medication Dispensed',
      RETURN: 'Stock Returned',
    };
    entries.push({
      id: m.movement_id,
      event_type: 'stock_movement',
      action: typeLabels[m.movement_type] || m.movement_type,
      description: m.reason || `${m.movement_type} of ${m.quantity} units`,
      entity_name: drug?.name || 'Unknown Drug',
      old_value: undefined,
      new_value: `${m.quantity} units`,
      performed_by: m.performed_by || '',
      performer_name: getPerformerName(m.performed_by),
      timestamp: m.created_at,
      metadata: {
        drug_code: drug?.code,
        batch_id: m.batch_id,
        movement_type: m.movement_type,
      },
    });
  });

  // Build entries from price changes
  pharmacyPriceAudits.forEach((a) => {
    entries.push({
      id: a.id,
      event_type: 'price_change',
      action: `${a.field_changed || 'Field'} Changed`,
      description:
        a.reason || `${a.field_changed} updated on ${a.service_name}`,
      entity_name: a.service_name || 'Unknown',
      old_value: a.old_value?.toString(),
      new_value: a.new_value?.toString(),
      performed_by: a.changed_by || '',
      performer_name: getPerformerName(a.changed_by),
      timestamp: a.changed_at,
      metadata: { service_type: a.service_type, field: a.field_changed },
    });
  });

  // Sort all entries by timestamp descending
  entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return entries.slice(0, limit);
}