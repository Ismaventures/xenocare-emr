// =============================================================================
// Service Pricing API
// Manage prices for all billable services: Consultation, Lab, Radiology, Pharmacy, Procedures, Beds
// =============================================================================

import { supabase } from '../../../api/supabaseClient';
import { sanitizeFilterValue } from '../../../lib/filterSanitizer';
import { createScopedLogger } from '../../../utils/logger';

const log = createScopedLogger('ServicePricing');

// =============================================================================
// Types
// =============================================================================

export type ServiceCategory =
  | 'consultation'
  | 'lab'
  | 'radiology'
  | 'pharmacy'
  | 'procedure'
  | 'bed';

// Insurance type for pricing tiers
// Note: DHML is NOT a separate insurance type ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â it's the default HMO for Military NHIS
export type InsurancePricingType =
  | 'Private'
  | 'Military_NHIS'
  | 'Civilian_NHIS'
  | 'Retainership'
  | 'GIFSHIP'
  | 'Security_Services_NHIS';

// Procedure categories from database
export type ProcedureCategory =
  | 'surgical'
  | 'diagnostic'
  | 'therapeutic'
  | 'minor'
  | 'major'
  | 'endoscopy'
  | 'biopsy'
  | 'injection'
  | 'infusion'
  | 'wound_care'
  | 'cardiovascular'
  | 'orthopedic'
  | 'neurological'
  | 'obstetric'
  | 'other';

// Bed types from database
export type BedType =
  | 'standard'
  | 'electric'
  | 'icu'
  | 'pediatric'
  | 'bariatric'
  | 'low'
  | 'stretcher'
  | 'crib'
  | 'bassinet';

// Ward types from database
export type WardType =
  | 'general'
  | 'icu'
  | 'pediatric'
  | 'maternity'
  | 'surgical'
  | 'orthopedic'
  | 'cardiac'
  | 'emergency'
  | 'psychiatric'
  | 'isolation';

export interface ServicePriceItem {
  id: string;
  code: string;
  name: string;
  category: ServiceCategory;
  subcategory?: string;
  description?: string;

  // Regular pricing
  price: number;

  // NHIS pricing
  nhis_code?: string;
  nhis_price: number;
  is_nhis_covered: boolean;
  nhis_percentage: number; // Override percentage (0 = use default category rate)

  // NHIS Authorization requirement
  requires_nhis_authorization?: boolean;

  // Status
  is_active: boolean;

  // Audit
  updated_at?: string;
  updated_by?: string;
}

// Procedure-specific item
export interface ProcedureItem extends ServicePriceItem {
  procedure_category: ProcedureCategory;
  cpt_code?: string;
  icd10_pcs_code?: string;
  body_system?: string;
  requires_anesthesia?: boolean;
  anesthesia_type?: string;
  typical_duration_minutes?: number;
  base_price: number;
  professional_fee?: number;
  facility_fee?: number;
}

// Bed/Ward pricing item
export interface BedPriceItem {
  id: string;
  ward_id: string;
  ward_name: string;
  ward_code: string;
  ward_type: WardType;
  bed_number: string;
  bed_type: BedType;
  daily_rate: number;
  nhis_daily_rate?: number;
  is_active: boolean;
  // Ward-level pricing
  ward_price?: number;
  ward_nhis_price?: number;
  ward_is_nhis_covered?: boolean;
}

// Insurance-based pricing for a service
export interface InsuranceTypePricing {
  id: string;
  service_id: string;
  service_name: string;
  service_category: ServiceCategory;
  insurance_type: InsurancePricingType;
  price: number;
  coverage_percentage: number;
  is_covered: boolean;
  requires_authorization: boolean;
  updated_at?: string;
}

// NHIS Required Service (services that must go through NHIS verification)
export interface NhisRequiredService {
  id: string;
  service_id: string;
  service_name: string;
  service_category: ServiceCategory;
  service_code: string;
  is_required: boolean;
  authorization_type: 'pre-auth' | 'concurrent' | 'retrospective';
  notes?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface ConsultationFeeItem {
  id: string;
  clinic_id: string;
  clinic_name: string;
  department_name?: string;

  // Regular fees
  consultation_fee: number;
  follow_up_fee: number;
  emergency_fee: number;

  // NHIS fees
  nhis_consultation_fee: number;
  nhis_follow_up_fee: number;
  nhis_emergency_fee: number;

  is_active: boolean;
  updated_at?: string;
  updated_by?: string;
}

export interface UpdateServicePriceDTO {
  price?: number;
  nhis_code?: string;
  nhis_price?: number;
  is_nhis_covered?: boolean;
  nhis_percentage?: number;
  requires_nhis_authorization?: boolean;
  description?: string;
  is_active?: boolean;
  updated_by?: string;
  reason?: string; // For audit trail
}

export interface UpdateConsultationFeeDTO {
  consultation_fee?: number;
  follow_up_fee?: number;
  emergency_fee?: number;
  nhis_consultation_fee?: number;
  nhis_follow_up_fee?: number;
  nhis_emergency_fee?: number;
  updated_by?: string;
  reason?: string;
}

export interface ServicePriceFilters {
  category?: ServiceCategory;
  search?: string;
  is_nhis_covered?: boolean;
  is_active?: boolean;
}

export interface ServicePriceStats {
  total_services: number;
  nhis_covered_count: number;
  active_count: number;
  by_category: {
    consultation: number;
    lab: number;
    radiology: number;
    pharmacy: number;
  };
}

// =============================================================================
// Get All Services with Prices
// =============================================================================

export async function getAllServicePrices(
  filters: ServicePriceFilters = {},
): Promise<ServicePriceItem[]> {
  const allServices: ServicePriceItem[] = [];

  // 1. Lab Tests
  if (!filters.category || filters.category === 'lab') {
    try {
      let labQuery = supabase
        .from('lab_test_catalogue')
        .select(
          'id, code, name, category, specimen_type, price, nhis_code, nhis_price, is_nhis_covered, nhis_percentage, requires_nhis_authorization, description, is_active, updated_at',
        )
        .order('name');

      if (filters.is_nhis_covered !== undefined) {
        labQuery = labQuery.eq('is_nhis_covered', filters.is_nhis_covered);
      }
      if (filters.is_active !== undefined) {
        labQuery = labQuery.eq('is_active', filters.is_active);
      }
      if (filters.search) {
        const safeSearch = sanitizeFilterValue(filters.search);
        labQuery = labQuery.or(
          `name.ilike.%${safeSearch}%,code.ilike.%${safeSearch}%`,
        );
      }

      const { data: labTests, error } = await labQuery;

      if (error) {
        log.error('[ServicePricing] Error fetching lab tests:', error);
      } else if (labTests) {
        log.info(`[ServicePricing] Fetched ${labTests.length} lab tests`);
        // NHIS Price is the single source of truth for NHIS billing
        allServices.push(
          ...labTests.map((test) => ({
            id: test.id,
            code: test.code || '',
            name: test.name || 'Unknown Test',
            category: 'lab' as ServiceCategory,
            subcategory: test.category,
            description:
              test.description || `Specimen: ${test.specimen_type || 'N/A'}`,
            price: Number(test.price) || 0,
            nhis_code: test.nhis_code || undefined,
            nhis_price: Number(test.nhis_price) || 0, // NHIS price is the single source of truth
            is_nhis_covered: test.is_nhis_covered ?? true,
            nhis_percentage: Number(test.nhis_percentage) || 0,
            requires_nhis_authorization:
              test.requires_nhis_authorization ?? false,
            is_active: test.is_active ?? true,
            updated_at: test.updated_at,
          })),
        );
      }
    } catch (err) {
      log.error('[ServicePricing] Exception fetching lab tests:', err);
    }
  }

  // 2. Radiology/Imaging Exams
  if (!filters.category || filters.category === 'radiology') {
    try {
      let radiologyQuery = supabase
        .from('imaging_catalogue')
        .select(
          'id, code, name, modality, body_part, price, nhis_code, nhis_price, is_nhis_covered, nhis_percentage, requires_nhis_authorization, description, is_active, updated_at',
        )
        .order('name');

      if (filters.is_nhis_covered !== undefined) {
        radiologyQuery = radiologyQuery.eq(
          'is_nhis_covered',
          filters.is_nhis_covered,
        );
      }
      if (filters.is_active !== undefined) {
        radiologyQuery = radiologyQuery.eq('is_active', filters.is_active);
      }
      if (filters.search) {
        const safeSearch = sanitizeFilterValue(filters.search);
        radiologyQuery = radiologyQuery.or(
          `name.ilike.%${safeSearch}%,code.ilike.%${safeSearch}%`,
        );
      }

      const { data: imagingExams, error } = await radiologyQuery;

      if (error) {
        log.error('[ServicePricing] Error fetching imaging exams:', error);
      } else if (imagingExams) {
        log.info(
          `[ServicePricing] Fetched ${imagingExams.length} imaging exams`,
        );
        // NHIS Price is the single source of truth for NHIS billing
        allServices.push(
          ...imagingExams.map((exam) => ({
            id: exam.id,
            code: exam.code || '',
            name: exam.name || 'Unknown Exam',
            category: 'radiology' as ServiceCategory,
            subcategory: exam.modality,
            description:
              exam.description || `Body Part: ${exam.body_part || 'N/A'}`,
            price: Number(exam.price) || 0,
            nhis_code: exam.nhis_code || undefined,
            nhis_price: Number(exam.nhis_price) || 0, // NHIS price is the single source of truth
            is_nhis_covered: exam.is_nhis_covered ?? true,
            nhis_percentage: Number(exam.nhis_percentage) || 0,
            requires_nhis_authorization:
              exam.requires_nhis_authorization ?? false,
            is_active: exam.is_active ?? true,
            updated_at: exam.updated_at,
          })),
        );
      }
    } catch (err) {
      log.error('[ServicePricing] Exception fetching imaging exams:', err);
    }
  }

  // 3. Pharmacy/Drugs
  if (!filters.category || filters.category === 'pharmacy') {
    try {
      let pharmacyQuery = supabase
        .from('drug_catalogue')
        .select(
          'id, code, name, category, brand_name, description, selling_price, unit_cost, nhis_code, nhis_price, is_nhis_covered, nhis_percentage, requires_nhis_authorization, is_active, updated_at',
        )
        .order('name');

      if (filters.is_nhis_covered !== undefined) {
        pharmacyQuery = pharmacyQuery.eq(
          'is_nhis_covered',
          filters.is_nhis_covered,
        );
      }
      if (filters.is_active !== undefined) {
        pharmacyQuery = pharmacyQuery.eq('is_active', filters.is_active);
      }
      if (filters.search) {
        const safeSearch = sanitizeFilterValue(filters.search);
        pharmacyQuery = pharmacyQuery.or(
          `name.ilike.%${safeSearch}%,code.ilike.%${safeSearch}%,brand_name.ilike.%${safeSearch}%`,
        );
      }

      const { data: drugs, error } = await pharmacyQuery;

      if (error) {
        log.error('[ServicePricing] Error fetching drugs:', error);
      } else if (drugs) {
        log.info(`[ServicePricing] Fetched ${drugs.length} drugs`);
        // NHIS Price is the single source of truth for NHIS billing
        // Display NHIS price as the primary price for service pricing management
        allServices.push(
          ...drugs.map((drug) => ({
            id: drug.id,
            code: drug.code || '',
            name: drug.name || 'Unknown Drug',
            category: 'pharmacy' as ServiceCategory,
            subcategory: drug.category,
            description: drug.description || drug.brand_name,
            price: Number(drug.selling_price) || Number(drug.unit_cost) || 0,
            nhis_code: drug.nhis_code || undefined,
            nhis_price: Number(drug.nhis_price) || 0, // NHIS price is the single source of truth
            is_nhis_covered: drug.is_nhis_covered ?? false,
            nhis_percentage: Number(drug.nhis_percentage) || 0,
            requires_nhis_authorization:
              drug.requires_nhis_authorization ?? false,
            is_active: drug.is_active ?? true,
            updated_at: drug.updated_at,
          })),
        );
      }
    } catch (err) {
      log.error('[ServicePricing] Exception fetching drugs:', err);
    }
  }

  log.info(`[ServicePricing] Total services fetched: ${allServices.length}`);
  return allServices;
}

// =============================================================================
// Get Consultation Fees (by Clinic)
// =============================================================================

export async function getConsultationFees(): Promise<ConsultationFeeItem[]> {
  const { data: clinics, error } = await supabase
    .from('clinics')
    .select(
      `
      id,
      clinic_id,
      clinic_name,
      consultation_fee,
      follow_up_fee,
      emergency_fee,
      nhis_consultation_fee,
      nhis_follow_up_fee,
      nhis_emergency_fee,
      is_active,
      updated_at,
      department:departments(name)
    `,
    )
    .order('clinic_name');

  if (error) {
    log.error('Error fetching consultation fees:', error);
    return [];
  }

  return (clinics || []).map((clinic) => ({
    id: clinic.id,
    clinic_id: clinic.clinic_id,
    clinic_name: clinic.clinic_name,
    department_name: (clinic.department as any)?.name,
    consultation_fee: clinic.consultation_fee || 0,
    follow_up_fee: clinic.follow_up_fee || 0,
    emergency_fee: clinic.emergency_fee || 0,
    nhis_consultation_fee:
      clinic.nhis_consultation_fee || clinic.consultation_fee || 0,
    nhis_follow_up_fee: clinic.nhis_follow_up_fee || clinic.follow_up_fee || 0,
    nhis_emergency_fee: clinic.nhis_emergency_fee || clinic.emergency_fee || 0,
    is_active: clinic.is_active ?? true,
    updated_at: clinic.updated_at,
  }));
}

// =============================================================================
// Update Service Price
// =============================================================================

export async function updateServicePrice(
  category: ServiceCategory,
  serviceId: string,
  updates: UpdateServicePriceDTO,
): Promise<ServicePriceItem | null> {
  const tableName = getTableName(category);

  // Get current values for audit
  const { data: current } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', serviceId)
    .single();

  if (!current) {
    throw new Error('Service not found');
  }

  // Prepare update data
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.price !== undefined) {
    if (category === 'pharmacy') {
      updateData.selling_price = updates.price;
    } else {
      updateData.price = updates.price;
    }
  }
  if (updates.nhis_code !== undefined) updateData.nhis_code = updates.nhis_code;
  if (updates.nhis_price !== undefined)
    updateData.nhis_price = updates.nhis_price;
  if (updates.is_nhis_covered !== undefined)
    updateData.is_nhis_covered = updates.is_nhis_covered;
  if (updates.nhis_percentage !== undefined)
    updateData.nhis_percentage = updates.nhis_percentage;
  if (updates.requires_nhis_authorization !== undefined)
    updateData.requires_nhis_authorization =
      updates.requires_nhis_authorization;
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
  if (updates.updated_by) updateData.updated_by = updates.updated_by;

  // Update the service
  const { data: updated, error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('id', serviceId)
    .select()
    .single();

  if (error) {
    log.error('Error updating service price:', error);
    throw new Error(`Failed to update service price: ${error.message}`);
  }

  // Create audit trail entries for each changed field
  const auditEntries: any[] = [];
  const fieldsToAudit = [
    'price',
    'selling_price',
    'nhis_code',
    'nhis_price',
    'is_nhis_covered',
    'nhis_percentage',
    'requires_nhis_authorization',
    'is_active',
  ];

  for (const field of fieldsToAudit) {
    const oldValue = current[field];
    const newValue = updateData[field];

    if (newValue !== undefined && oldValue !== newValue) {
      auditEntries.push({
        service_type: category,
        service_id: serviceId,
        service_name: current.name,
        field_changed: field === 'selling_price' ? 'price' : field,
        old_value: String(oldValue ?? ''),
        new_value: String(newValue),
        changed_by: updates.updated_by,
        reason: updates.reason || 'Price update',
      });
    }
  }

  if (auditEntries.length > 0) {
    await supabase.from('service_price_audit').insert(auditEntries);
  }

  // Return normalized result
  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    category,
    subcategory: updated.category || updated.modality,
    description: updated.description,
    price: updated.selling_price || updated.price || 0,
    nhis_code: updated.nhis_code,
    nhis_price: updated.nhis_price || 0,
    is_nhis_covered: updated.is_nhis_covered ?? true,
    nhis_percentage: updated.nhis_percentage || 0,
    is_active: updated.is_active ?? true,
    updated_at: updated.updated_at,
  };
}

// =============================================================================
// Update Consultation Fee
// =============================================================================

export async function updateConsultationFee(
  clinicId: string,
  updates: UpdateConsultationFeeDTO,
): Promise<ConsultationFeeItem | null> {
  // Get current values for audit
  const { data: current } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', clinicId)
    .single();

  if (!current) {
    throw new Error('Clinic not found');
  }

  // Prepare update data
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.consultation_fee !== undefined)
    updateData.consultation_fee = updates.consultation_fee;
  if (updates.follow_up_fee !== undefined)
    updateData.follow_up_fee = updates.follow_up_fee;
  if (updates.emergency_fee !== undefined)
    updateData.emergency_fee = updates.emergency_fee;
  if (updates.nhis_consultation_fee !== undefined)
    updateData.nhis_consultation_fee = updates.nhis_consultation_fee;
  if (updates.nhis_follow_up_fee !== undefined)
    updateData.nhis_follow_up_fee = updates.nhis_follow_up_fee;
  if (updates.nhis_emergency_fee !== undefined)
    updateData.nhis_emergency_fee = updates.nhis_emergency_fee;
  if (updates.updated_by) updateData.updated_by = updates.updated_by;

  // Update the clinic
  const { data: updated, error } = await supabase
    .from('clinics')
    .update(updateData)
    .eq('id', clinicId)
    .select(
      `
      id,
      clinic_id,
      clinic_name,
      consultation_fee,
      follow_up_fee,
      emergency_fee,
      nhis_consultation_fee,
      nhis_follow_up_fee,
      nhis_emergency_fee,
      is_active,
      updated_at,
      department:departments(department_name)
    `,
    )
    .single();

  if (error) {
    log.error('Error updating consultation fee:', error);
    throw new Error(`Failed to update consultation fee: ${error.message}`);
  }

  // Create audit trail
  const auditEntries: any[] = [];
  const fieldsToAudit = [
    'consultation_fee',
    'follow_up_fee',
    'emergency_fee',
    'nhis_consultation_fee',
    'nhis_follow_up_fee',
    'nhis_emergency_fee',
  ];

  for (const field of fieldsToAudit) {
    const oldValue = current[field];
    const newValue = updateData[field];

    if (newValue !== undefined && oldValue !== newValue) {
      auditEntries.push({
        service_type: 'consultation',
        service_id: clinicId,
        service_name: current.clinic_name,
        field_changed: field,
        old_value: String(oldValue ?? 0),
        new_value: String(newValue),
        changed_by: updates.updated_by,
        reason: updates.reason || 'Fee update',
      });
    }
  }

  if (auditEntries.length > 0) {
    await supabase.from('service_price_audit').insert(auditEntries);
  }

  return {
    id: updated.id,
    clinic_id: updated.clinic_id,
    clinic_name: updated.clinic_name,
    department_name: (updated.department as any)?.department_name,
    consultation_fee: updated.consultation_fee || 0,
    follow_up_fee: updated.follow_up_fee || 0,
    emergency_fee: updated.emergency_fee || 0,
    nhis_consultation_fee: updated.nhis_consultation_fee || 0,
    nhis_follow_up_fee: updated.nhis_follow_up_fee || 0,
    nhis_emergency_fee: updated.nhis_emergency_fee || 0,
    is_active: updated.is_active ?? true,
    updated_at: updated.updated_at,
  };
}

// =============================================================================
// Get Service Price Stats
// =============================================================================

export async function getServicePriceStats(): Promise<ServicePriceStats> {
  const [labStats, radiologyStats, pharmacyStats, consultationStats] =
    await Promise.all([
      supabase
        .from('lab_test_catalogue')
        .select('id, is_nhis_covered, is_active'),
      supabase
        .from('imaging_catalogue')
        .select('id, is_nhis_covered, is_active'),
      supabase.from('drug_catalogue').select('id, is_nhis_covered, is_active'),
      supabase.from('clinics').select('id, is_active'),
    ]);

  const labs = labStats.data || [];
  const radiology = radiologyStats.data || [];
  const pharmacy = pharmacyStats.data || [];
  const consultations = consultationStats.data || [];

  const total =
    labs.length + radiology.length + pharmacy.length + consultations.length;
  const nhisCount =
    labs.filter((l) => l.is_nhis_covered).length +
    radiology.filter((r) => r.is_nhis_covered).length +
    pharmacy.filter((p) => p.is_nhis_covered).length +
    consultations.length; // Consultations are always NHIS covered

  const activeCount =
    labs.filter((l) => l.is_active).length +
    radiology.filter((r) => r.is_active).length +
    pharmacy.filter((p) => p.is_active).length +
    consultations.filter((c) => c.is_active).length;

  return {
    total_services: total,
    nhis_covered_count: nhisCount,
    active_count: activeCount,
    by_category: {
      consultation: consultations.length,
      lab: labs.length,
      radiology: radiology.length,
      pharmacy: pharmacy.length,
    },
  };
}

// =============================================================================
// Get Price Audit History
// =============================================================================

export type AuditServiceType = ServiceCategory | 'insurance_config';

export async function getPriceAuditHistory(
  filters: {
    service_type?: AuditServiceType | string;
    service_id?: string;
    limit?: number;
  } = {},
): Promise<any[]> {
  let query = supabase
    .from('service_price_audit')
    .select(
      `
      id,
      service_type,
      service_id,
      service_name,
      field_changed,
      old_value,
      new_value,
      changed_at,
      reason,
      changed_by_staff:staff!service_price_audit_changed_by_fkey(first_name, last_name, role)
    `,
    )
    .order('changed_at', { ascending: false });

  if (filters.service_type) {
    query = query.eq('service_type', filters.service_type);
  }
  if (filters.service_id) {
    query = query.eq('service_id', filters.service_id);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    log.error('Error fetching audit history:', error);
    return [];
  }

  return (data || []).map((entry) => {
    const staff = entry.changed_by_staff as any;
    const changedByName = staff
      ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
      : 'Unknown';
    const changedByRole = staff?.role
      ? staff.role
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase())
      : 'Unknown';
    return {
      ...entry,
      changed_by_name: changedByName || 'Unknown',
      changed_by_role: changedByRole,
    };
  });
}

// =============================================================================
// Get NHIS Config
// =============================================================================

export async function getNhisConfig(): Promise<any[]> {
  const { data, error } = await supabase
    .from('nhis_config')
    .select('*')
    .eq('is_active', true)
    .order('payment_category');

  if (error) {
    log.error('Error fetching NHIS config:', error);
    return [];
  }

  return data || [];
}

// =============================================================================
// Update NHIS Config
// =============================================================================

export async function updateNhisConfig(
  id: string,
  updates: {
    coverage_percentage?: number;
    consultation_fully_covered?: boolean;
    description?: string;
  },
): Promise<any> {
  const { data, error } = await supabase
    .from('nhis_config')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update NHIS config: ${error.message}`);
  }

  return data;
}

// =============================================================================
// Create New Lab Test
// =============================================================================

export interface CreateLabTestDTO {
  code: string;
  name: string;
  category: string;
  specimen_type: string;
  price: number;
  tat_minutes?: number;
  nhis_code?: string;
  nhis_price?: number;
  is_nhis_covered?: boolean;
  nhis_percentage?: number;
  description?: string;
}

export async function createLabTest(dto: CreateLabTestDTO): Promise<any> {
  const { data, error } = await supabase
    .from('lab_test_catalogue')
    .insert({
      code: dto.code,
      name: dto.name,
      category: dto.category,
      specimen_type: dto.specimen_type,
      price: dto.price,
      tat_minutes: dto.tat_minutes || 60,
      nhis_code: dto.nhis_code,
      nhis_price: dto.nhis_price || dto.price,
      is_nhis_covered: dto.is_nhis_covered ?? true,
      nhis_percentage: dto.nhis_percentage || 0,
      description: dto.description,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create lab test: ${error.message}`);
  }

  return data;
}

// =============================================================================
// Create New Radiology Exam
// =============================================================================

export interface CreateRadiologyExamDTO {
  code: string;
  name: string;
  modality:
    | 'X-Ray'
    | 'Ultrasound'
    | 'CT'
    | 'MRI'
    | 'Fluoroscopy'
    | 'Mammography';
  body_part: string;
  price: number;
  nhis_code?: string;
  nhis_price?: number;
  is_nhis_covered?: boolean;
  nhis_percentage?: number;
  description?: string;
}

export async function createRadiologyExam(
  dto: CreateRadiologyExamDTO,
): Promise<any> {
  const { data, error } = await supabase
    .from('imaging_catalogue')
    .insert({
      code: dto.code,
      name: dto.name,
      modality: dto.modality,
      body_part: dto.body_part,
      price: dto.price,
      nhis_code: dto.nhis_code,
      nhis_price: dto.nhis_price || dto.price,
      is_nhis_covered: dto.is_nhis_covered ?? true,
      nhis_percentage: dto.nhis_percentage || 0,
      description: dto.description,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create radiology exam: ${error.message}`);
  }

  return data;
}

// =============================================================================
// Get Lab Test Categories
// =============================================================================

export async function getLabTestCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('lab_test_catalogue')
    .select('category')
    .not('category', 'is', null);

  if (error) return [];

  const categories = [...new Set(data?.map((d) => d.category).filter(Boolean))];
  return categories.sort();
}

// =============================================================================
// Get Specimen Types
// =============================================================================

export async function getSpecimenTypes(): Promise<string[]> {
  const { data, error } = await supabase
    .from('lab_test_catalogue')
    .select('specimen_type')
    .not('specimen_type', 'is', null);

  if (error) return [];

  const types = [...new Set(data?.map((d) => d.specimen_type).filter(Boolean))];
  return types.sort();
}

// =============================================================================
// Get Imaging Modalities
// =============================================================================

export function getImagingModalities(): string[] {
  return ['X-Ray', 'Ultrasound', 'CT', 'MRI', 'Fluoroscopy', 'Mammography'];
}

// =============================================================================
// Helpers
// =============================================================================

function getTableName(category: ServiceCategory): string {
  switch (category) {
    case 'lab':
      return 'lab_test_catalogue';
    case 'radiology':
      return 'imaging_catalogue';
    case 'pharmacy':
      return 'drug_catalogue';
    case 'procedure':
      return 'procedure_catalogue';
    default:
      return 'lab_test_catalogue';
  }
}

// =============================================================================
// Get Procedures with Prices (categorized)
// =============================================================================

export async function getProcedurePrices(
  filters: {
    category?: ProcedureCategory;
    search?: string;
    is_active?: boolean;
  } = {},
): Promise<ProcedureItem[]> {
  try {
    let query = supabase
      .from('procedure_catalogue')
      .select('*')
      .order('category')
      .order('name');

    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters.search) {
      const safeSearch = sanitizeFilterValue(filters.search);
      query = query.or(`name.ilike.%${safeSearch}%,code.ilike.%${safeSearch}%`);
    }

    const { data, error } = await query;

    if (error) {
      log.error('[ServicePricing] Error fetching procedures:', error);
      return [];
    }

    return (data || []).map((proc) => ({
      id: proc.id,
      code: proc.code || '',
      name: proc.name || 'Unknown Procedure',
      category: 'procedure' as ServiceCategory,
      subcategory: proc.subcategory,
      description: proc.description,
      procedure_category: proc.category as ProcedureCategory,
      cpt_code: proc.cpt_code,
      icd10_pcs_code: proc.icd10_pcs_code,
      body_system: proc.body_system,
      requires_anesthesia: proc.requires_anesthesia,
      anesthesia_type: proc.anesthesia_type,
      typical_duration_minutes: proc.typical_duration_minutes,
      price: Number(proc.base_price) || 0,
      base_price: Number(proc.base_price) || 0,
      professional_fee: Number(proc.professional_fee) || 0,
      facility_fee: Number(proc.facility_fee) || 0,
      nhis_code: proc.code,
      nhis_price: Number(proc.nhis_price) || Number(proc.base_price) || 0,
      is_nhis_covered: true,
      nhis_percentage: 0,
      requires_nhis_authorization: proc.requires_nhis_authorization ?? false,
      is_active: proc.is_active ?? true,
      updated_at: proc.updated_at,
    }));
  } catch (err) {
    log.error('[ServicePricing] Exception fetching procedures:', err);
    return [];
  }
}

// =============================================================================
// Update Procedure Price
// =============================================================================

export async function updateProcedurePrice(
  procedureId: string,
  updates: {
    base_price?: number;
    nhis_price?: number;
    professional_fee?: number;
    facility_fee?: number;
    requires_nhis_authorization?: boolean;
    is_active?: boolean;
    updated_by?: string;
    reason?: string;
  },
): Promise<any> {
  // Get current values for audit
  const { data: current } = await supabase
    .from('procedure_catalogue')
    .select('*')
    .eq('id', procedureId)
    .single();

  if (!current) {
    throw new Error('Procedure not found');
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.base_price !== undefined)
    updateData.base_price = updates.base_price;
  if (updates.nhis_price !== undefined)
    updateData.nhis_price = updates.nhis_price;
  if (updates.professional_fee !== undefined)
    updateData.professional_fee = updates.professional_fee;
  if (updates.facility_fee !== undefined)
    updateData.facility_fee = updates.facility_fee;
  if (updates.requires_nhis_authorization !== undefined)
    updateData.requires_nhis_authorization =
      updates.requires_nhis_authorization;
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
  if (updates.updated_by) updateData.updated_by = updates.updated_by;

  const { data, error } = await supabase
    .from('procedure_catalogue')
    .update(updateData)
    .eq('id', procedureId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update procedure: ${error.message}`);
  }

  // Create audit entries
  const auditEntries: any[] = [];
  const fieldsToAudit = [
    'base_price',
    'nhis_price',
    'professional_fee',
    'facility_fee',
    'requires_nhis_authorization',
  ];

  for (const field of fieldsToAudit) {
    const oldValue = current[field];
    const newValue = updateData[field];

    if (newValue !== undefined && oldValue !== newValue) {
      auditEntries.push({
        service_type: 'procedure',
        service_id: procedureId,
        service_name: current.name,
        field_changed: field,
        old_value: String(oldValue ?? ''),
        new_value: String(newValue),
        changed_by: updates.updated_by,
        reason: updates.reason || 'Procedure price update',
      });
    }
  }

  if (auditEntries.length > 0) {
    await supabase.from('service_price_audit').insert(auditEntries);
  }

  return data;
}

// =============================================================================
// Get Bed Prices
// =============================================================================

export async function getBedPrices(
  filters: {
    ward_type?: WardType;
    bed_type?: BedType;
    search?: string;
  } = {},
): Promise<BedPriceItem[]> {
  try {
    let query = supabase
      .from('beds')
      .select(
        `
        id,
        bed_number,
        bed_type,
        daily_rate,
        is_active,
        ward:wards!beds_ward_id_fkey(
          id,
          name,
          code,
          ward_type,
          price,
          nhis_price,
          is_nhis_covered
        )
      `,
      )
      .eq('is_active', true)
      .order('bed_number');

    if (filters.bed_type) {
      query = query.eq('bed_type', filters.bed_type);
    }
    if (filters.search) {
      query = query.ilike('bed_number', `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      log.error('[ServicePricing] Error fetching beds:', error);
      return [];
    }

    return (data || [])
      .filter((bed) => bed.ward)
      .filter(
        (bed) =>
          !filters.ward_type ||
          (bed.ward as any)?.ward_type === filters.ward_type,
      )
      .map((bed) => {
        const ward = bed.ward as any;
        return {
          id: bed.id,
          ward_id: ward?.id,
          ward_name: ward?.name || 'Unknown Ward',
          ward_code: ward?.code || '',
          ward_type: ward?.ward_type as WardType,
          bed_number: bed.bed_number,
          bed_type: bed.bed_type as BedType,
          daily_rate: Number(bed.daily_rate) || 0,
          nhis_daily_rate:
            Number(ward?.nhis_price) || Number(bed.daily_rate) || 0,
          is_active: bed.is_active ?? true,
          ward_price: Number(ward?.price) || 0,
          ward_nhis_price: Number(ward?.nhis_price) || 0,
          ward_is_nhis_covered: ward?.is_nhis_covered ?? true,
        };
      });
  } catch (err) {
    log.error('[ServicePricing] Exception fetching beds:', err);
    return [];
  }
}

// =============================================================================
// Get Ward Prices (for editing ward-level pricing)
// =============================================================================

export async function getWardPrices(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('wards')
      .select(
        'id, name, code, ward_type, price, nhis_price, is_nhis_covered, total_beds, available_beds, is_active',
      )
      .order('name');

    if (error) {
      log.error('[ServicePricing] Error fetching wards:', error);
      return [];
    }

    return (data || []).map((ward) => ({
      id: ward.id,
      name: ward.name,
      code: ward.code,
      ward_type: ward.ward_type,
      price: Number(ward.price) || 0,
      nhis_price: Number(ward.nhis_price) || 0,
      is_nhis_covered: ward.is_nhis_covered ?? true,
      total_beds: ward.total_beds || 0,
      available_beds: ward.available_beds || 0,
      is_active: ward.is_active ?? true,
    }));
  } catch (err) {
    log.error('[ServicePricing] Exception fetching wards:', err);
    return [];
  }
}

// =============================================================================
// Update Ward Price
// =============================================================================

export async function updateWardPrice(
  wardId: string,
  updates: {
    price?: number;
    nhis_price?: number;
    is_nhis_covered?: boolean;
    updated_by?: string;
    reason?: string;
  },
): Promise<any> {
  const { data: current } = await supabase
    .from('wards')
    .select('*')
    .eq('id', wardId)
    .single();

  if (!current) {
    throw new Error('Ward not found');
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.price !== undefined) updateData.price = updates.price;
  if (updates.nhis_price !== undefined)
    updateData.nhis_price = updates.nhis_price;
  if (updates.is_nhis_covered !== undefined)
    updateData.is_nhis_covered = updates.is_nhis_covered;
  if (updates.updated_by) updateData.updated_by = updates.updated_by;

  const { data, error } = await supabase
    .from('wards')
    .update(updateData)
    .eq('id', wardId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update ward: ${error.message}`);
  }

  // Audit trail
  const auditEntries: any[] = [];
  for (const field of ['price', 'nhis_price', 'is_nhis_covered']) {
    const oldValue = current[field];
    const newValue = updateData[field];
    if (newValue !== undefined && oldValue !== newValue) {
      auditEntries.push({
        service_type: 'bed',
        service_id: wardId,
        service_name: current.name,
        field_changed: field,
        old_value: String(oldValue ?? ''),
        new_value: String(newValue),
        changed_by: updates.updated_by,
        reason: updates.reason || 'Ward price update',
      });
    }
  }

  if (auditEntries.length > 0) {
    await supabase.from('service_price_audit').insert(auditEntries);
  }

  return data;
}

// =============================================================================
// Update Bed Daily Rate
// =============================================================================

export async function updateBedPrice(
  bedId: string,
  updates: {
    daily_rate?: number;
    updated_by?: string;
    reason?: string;
  },
): Promise<any> {
  // Get current bed info with ward
  const { data: current } = await supabase
    .from('beds')
    .select(
      `
      *,
      ward:wards!beds_ward_id_fkey(name)
    `,
    )
    .eq('id', bedId)
    .single();

  if (!current) {
    throw new Error('Bed not found');
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.daily_rate !== undefined)
    updateData.daily_rate = updates.daily_rate;

  const { data, error } = await supabase
    .from('beds')
    .update(updateData)
    .eq('id', bedId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update bed: ${error.message}`);
  }

  // Audit trail for bed price changes
  if (
    updates.daily_rate !== undefined &&
    current.daily_rate !== updates.daily_rate
  ) {
    const wardName = (current.ward as any)?.name || 'Unknown Ward';
    await supabase.from('service_price_audit').insert({
      service_type: 'bed',
      service_id: bedId,
      service_name: `${wardName} - Bed ${current.bed_number}`,
      field_changed: 'daily_rate',
      old_value: String(current.daily_rate ?? 0),
      new_value: String(updates.daily_rate),
      changed_by: updates.updated_by,
      reason: updates.reason || 'Bed daily rate update',
    });
  }

  return data;
}

// =============================================================================
// Get NHIS Required Services
// =============================================================================

export async function getNhisRequiredServices(): Promise<
  NhisRequiredService[]
> {
  // Fetch from all service tables where requires_nhis_authorization = true
  const results: NhisRequiredService[] = [];

  // Check procedures
  const { data: procedures } = await supabase
    .from('procedure_catalogue')
    .select('id, code, name, category')
    .eq('requires_nhis_authorization', true)
    .eq('is_active', true);

  if (procedures) {
    results.push(
      ...procedures.map((p) => ({
        id: p.id,
        service_id: p.id,
        service_name: p.name,
        service_category: 'procedure' as ServiceCategory,
        service_code: p.code,
        is_required: true,
        authorization_type: 'pre-auth' as const,
        updated_at: undefined,
        updated_by: undefined,
      })),
    );
  }

  // Check lab tests (if they have the field)
  const { data: labs } = await supabase
    .from('lab_test_catalogue')
    .select('id, code, name, category')
    .eq('requires_nhis_authorization', true)
    .eq('is_active', true);

  if (labs) {
    results.push(
      ...labs.map((l) => ({
        id: l.id,
        service_id: l.id,
        service_name: l.name,
        service_category: 'lab' as ServiceCategory,
        service_code: l.code,
        is_required: true,
        authorization_type: 'pre-auth' as const,
        updated_at: undefined,
        updated_by: undefined,
      })),
    );
  }

  // Check radiology
  const { data: radiology } = await supabase
    .from('imaging_catalogue')
    .select('id, code, name, modality')
    .eq('requires_nhis_authorization', true)
    .eq('is_active', true);

  if (radiology) {
    results.push(
      ...radiology.map((r) => ({
        id: r.id,
        service_id: r.id,
        service_name: r.name,
        service_category: 'radiology' as ServiceCategory,
        service_code: r.code,
        is_required: true,
        authorization_type: 'pre-auth' as const,
        updated_at: undefined,
        updated_by: undefined,
      })),
    );
  }

  return results;
}

// =============================================================================
// Search All Services (for NHIS Required Services selector)
// =============================================================================

export async function searchAllServices(search: string): Promise<
  Array<{
    id: string;
    name: string;
    code: string;
    category: ServiceCategory;
    requires_nhis_authorization: boolean;
  }>
> {
  if (!search || search.length < 2) return [];

  const results: any[] = [];

  // Search procedures
  const { data: procedures } = await supabase
    .from('procedure_catalogue')
    .select('id, code, name, requires_nhis_authorization')
    .eq('is_active', true)
    .or(
      `name.ilike.%${sanitizeFilterValue(search)}%,code.ilike.%${sanitizeFilterValue(search)}%`,
    )
    .limit(20);

  if (procedures) {
    results.push(
      ...procedures.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        category: 'procedure' as ServiceCategory,
        requires_nhis_authorization: p.requires_nhis_authorization ?? false,
      })),
    );
  }

  // Search lab tests
  const { data: labs } = await supabase
    .from('lab_test_catalogue')
    .select('id, code, name, requires_nhis_authorization')
    .eq('is_active', true)
    .or(
      `name.ilike.%${sanitizeFilterValue(search)}%,code.ilike.%${sanitizeFilterValue(search)}%`,
    )
    .limit(20);

  if (labs) {
    results.push(
      ...labs.map((l) => ({
        id: l.id,
        name: l.name,
        code: l.code,
        category: 'lab' as ServiceCategory,
        requires_nhis_authorization:
          (l as any).requires_nhis_authorization ?? false,
      })),
    );
  }

  // Search radiology
  const { data: radiology } = await supabase
    .from('imaging_catalogue')
    .select('id, code, name, requires_nhis_authorization')
    .eq('is_active', true)
    .or(
      `name.ilike.%${sanitizeFilterValue(search)}%,code.ilike.%${sanitizeFilterValue(search)}%`,
    )
    .limit(20);

  if (radiology) {
    results.push(
      ...radiology.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        category: 'radiology' as ServiceCategory,
        requires_nhis_authorization:
          (r as any).requires_nhis_authorization ?? false,
      })),
    );
  }

  return results;
}

// =============================================================================
// Toggle NHIS Required Status for a Service
// =============================================================================

export async function toggleNhisRequired(
  serviceId: string,
  category: ServiceCategory,
  required: boolean,
  updatedBy?: string,
): Promise<void> {
  const tableName = getTableName(category);

  const { error } = await supabase
    .from(tableName)
    .update({
      requires_nhis_authorization: required,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    })
    .eq('id', serviceId);

  if (error) {
    throw new Error(`Failed to update NHIS requirement: ${error.message}`);
  }

  // Audit trail
  const { data: service } = await supabase
    .from(tableName)
    .select('name')
    .eq('id', serviceId)
    .single();

  await supabase.from('service_price_audit').insert({
    service_type: category,
    service_id: serviceId,
    service_name: service?.name || 'Unknown',
    field_changed: 'requires_nhis_authorization',
    old_value: String(!required),
    new_value: String(required),
    changed_by: updatedBy,
    reason: required
      ? 'Added NHIS pre-authorization requirement'
      : 'Removed NHIS pre-authorization requirement',
  });
}

// =============================================================================
// Get Insurance Type Pricing Configuration
// =============================================================================

export async function getInsuranceTypePricing(): Promise<any[]> {
  // Get NHIS config which has per-insurance-type coverage percentages
  const { data, error } = await supabase
    .from('nhis_config')
    .select('*')
    .order('payment_category');

  if (error) {
    log.error('[ServicePricing] Error fetching insurance pricing:', error);
    return [];
  }

  return data || [];
}

// =============================================================================
// Update Insurance Type Pricing
// =============================================================================

export async function updateInsuranceTypePricing(
  id: string,
  updates: {
    coverage_percentage?: number;
    consultation_fully_covered?: boolean;
    lab_coverage_percentage?: number;
    radiology_coverage_percentage?: number;
    pharmacy_coverage_percentage?: number;
    procedure_coverage_percentage?: number;
    bed_coverage_percentage?: number;
    description?: string;
    updated_by?: string;
    reason?: string;
  },
): Promise<any> {
  const { data: current } = await supabase
    .from('nhis_config')
    .select('*')
    .eq('id', id)
    .single();

  if (!current) {
    throw new Error('Insurance config not found');
  }

  const { reason, updated_by, ...updateFields } = updates;

  const { data, error } = await supabase
    .from('nhis_config')
    .update({
      ...updateFields,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update insurance pricing: ${error.message}`);
  }

  // Audit trail for insurance pricing changes
  const auditEntries: any[] = [];
  const fieldsToAudit = [
    'coverage_percentage',
    'consultation_fully_covered',
    'lab_coverage_percentage',
    'radiology_coverage_percentage',
    'pharmacy_coverage_percentage',
    'procedure_coverage_percentage',
    'bed_coverage_percentage',
  ];

  for (const field of fieldsToAudit) {
    const oldValue = current[field];
    const newValue = (updateFields as any)[field];
    if (newValue !== undefined && oldValue !== newValue) {
      auditEntries.push({
        service_type: 'insurance_config',
        service_id: id,
        service_name: `${current.payment_category} Insurance Config`,
        field_changed: field,
        old_value: String(oldValue ?? ''),
        new_value: String(newValue),
        changed_by: updated_by,
        reason:
          reason ||
          `Updated ${field.replace(/_/g, ' ')} for ${current.payment_category}`,
      });
    }
  }

  if (auditEntries.length > 0) {
    await supabase.from('service_price_audit').insert(auditEntries);
  }

  return data;
}

// =============================================================================
// Bulk Enable NHIS Pre-Authorization for All Services
// Enables requires_nhis_authorization for services that don't have it
// =============================================================================

export interface BulkEnableNhisResult {
  proceduresUpdated: number;
  labTestsUpdated: number;
  radiologyUpdated: number;
  pharmacyUpdated: number;
  totalUpdated: number;
}

export async function bulkEnableNhisPreauthorization(
  updatedBy?: string,
): Promise<BulkEnableNhisResult> {
  const result: BulkEnableNhisResult = {
    proceduresUpdated: 0,
    labTestsUpdated: 0,
    radiologyUpdated: 0,
    pharmacyUpdated: 0,
    totalUpdated: 0,
  };

  // 1. Update procedure_catalogue
  const { data: procedures, error: procErr } = await supabase
    .from('procedure_catalogue')
    .update({
      requires_nhis_authorization: true,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    })
    .or(
      'requires_nhis_authorization.is.null,requires_nhis_authorization.eq.false',
    )
    .select('id');

  if (procErr) {
    log.error('[BulkNhis] Error updating procedures:', procErr);
  } else {
    result.proceduresUpdated = procedures?.length || 0;
  }

  // 2. Update lab_test_catalogue
  const { data: labTests, error: labErr } = await supabase
    .from('lab_test_catalogue')
    .update({
      requires_nhis_authorization: true,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    })
    .or(
      'requires_nhis_authorization.is.null,requires_nhis_authorization.eq.false',
    )
    .select('id');

  if (labErr) {
    log.error('[BulkNhis] Error updating lab tests:', labErr);
  } else {
    result.labTestsUpdated = labTests?.length || 0;
  }

  // 3. Update imaging_catalogue (radiology)
  const { data: radiology, error: radErr } = await supabase
    .from('imaging_catalogue')
    .update({
      requires_nhis_authorization: true,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    })
    .or(
      'requires_nhis_authorization.is.null,requires_nhis_authorization.eq.false',
    )
    .select('id');

  if (radErr) {
    log.error('[BulkNhis] Error updating radiology:', radErr);
  } else {
    result.radiologyUpdated = radiology?.length || 0;
  }

  // 4. Update drug_catalogue (pharmacy)
  const { data: drugs, error: drugErr } = await supabase
    .from('drug_catalogue')
    .update({
      requires_nhis_authorization: true,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    })
    .or(
      'requires_nhis_authorization.is.null,requires_nhis_authorization.eq.false',
    )
    .select('drug_id');

  if (drugErr) {
    log.error('[BulkNhis] Error updating drugs:', drugErr);
  } else {
    result.pharmacyUpdated = drugs?.length || 0;
  }

  result.totalUpdated =
    result.proceduresUpdated +
    result.labTestsUpdated +
    result.radiologyUpdated +
    result.pharmacyUpdated;

  // Audit trail
  if (result.totalUpdated > 0) {
    await supabase.from('service_price_audit').insert({
      service_type: 'all' as any,
      service_id: 'bulk-operation',
      service_name: 'Bulk NHIS Pre-Authorization Enable',
      field_changed: 'requires_nhis_authorization',
      old_value: 'false/null',
      new_value: 'true',
      changed_by: updatedBy,
      reason: `Bulk enabled NHIS pre-authorization for ${result.totalUpdated} services (${result.proceduresUpdated} procedures, ${result.labTestsUpdated} lab tests, ${result.radiologyUpdated} radiology, ${result.pharmacyUpdated} pharmacy)`,
    });
  }

  return result;
}

// =============================================================================
// Get Services Missing NHIS Pre-Authorization
// Returns count of services that don't have requires_nhis_authorization=true
// =============================================================================

export interface ServicesMissingNhisCount {
  procedures: number;
  labTests: number;
  radiology: number;
  pharmacy: number;
  total: number;
}

export async function getServicesMissingNhisPreauth(): Promise<ServicesMissingNhisCount> {
  const result: ServicesMissingNhisCount = {
    procedures: 0,
    labTests: 0,
    radiology: 0,
    pharmacy: 0,
    total: 0,
  };

  // Count procedures without NHIS preauth
  const { count: procCount } = await supabase
    .from('procedure_catalogue')
    .select('id', { count: 'exact', head: true })
    .or(
      'requires_nhis_authorization.is.null,requires_nhis_authorization.eq.false',
    );
  result.procedures = procCount || 0;

  // Count lab tests without NHIS preauth
  const { count: labCount } = await supabase
    .from('lab_test_catalogue')
    .select('id', { count: 'exact', head: true })
    .or(
      'requires_nhis_authorization.is.null,requires_nhis_authorization.eq.false',
    );
  result.labTests = labCount || 0;

  // Count radiology without NHIS preauth
  const { count: radCount } = await supabase
    .from('imaging_catalogue')
    .select('id', { count: 'exact', head: true })
    .or(
      'requires_nhis_authorization.is.null,requires_nhis_authorization.eq.false',
    );
  result.radiology = radCount || 0;

  // Count drugs without NHIS preauth
  const { count: drugCount } = await supabase
    .from('drug_catalogue')
    .select('drug_id', { count: 'exact', head: true })
    .or(
      'requires_nhis_authorization.is.null,requires_nhis_authorization.eq.false',
    );
  result.pharmacy = drugCount || 0;

  result.total =
    result.procedures + result.labTests + result.radiology + result.pharmacy;

  return result;
}

// =============================================================================
// Selective Bulk Enable NHIS Pre-Authorization for Selected Services
// Admin can pick specific services to enable NHIS pre-authorization
// =============================================================================

export interface SelectiveEnableNhisRequest {
  services: Array<{
    id: string;
    category: ServiceCategory;
    name: string;
  }>;
  updatedBy?: string;
}

export interface SelectiveEnableNhisResult {
  successCount: number;
  failedCount: number;
  failedServices: string[];
}

export async function selectiveEnableNhisPreauthorization(
  request: SelectiveEnableNhisRequest,
): Promise<SelectiveEnableNhisResult> {
  const result: SelectiveEnableNhisResult = {
    successCount: 0,
    failedCount: 0,
    failedServices: [],
  };

  for (const service of request.services) {
    try {
      const tableName = getTableName(service.category);
      const idField = service.category === 'pharmacy' ? 'drug_id' : 'id';

      const { error } = await supabase
        .from(tableName)
        .update({
          requires_nhis_authorization: true,
          updated_at: new Date().toISOString(),
          updated_by: request.updatedBy,
        })
        .eq(idField, service.id);

      if (error) {
        result.failedCount++;
        result.failedServices.push(service.name);
      } else {
        result.successCount++;
      }
    } catch (err) {
      result.failedCount++;
      result.failedServices.push(service.name);
    }
  }

  // Audit trail
  if (result.successCount > 0) {
    await supabase.from('service_price_audit').insert({
      service_type: 'all' as any,
      service_id: 'selective-operation',
      service_name: 'Selective NHIS Pre-Authorization Enable',
      field_changed: 'requires_nhis_authorization',
      old_value: 'false',
      new_value: 'true',
      changed_by: request.updatedBy,
      reason: `Selectively enabled NHIS pre-authorization for ${result.successCount} services`,
    });
  }

  return result;
}

// =============================================================================
// Get Procedure Categories
// =============================================================================

export function getProcedureCategories(): ProcedureCategory[] {
  return [
    'surgical',
    'diagnostic',
    'therapeutic',
    'minor',
    'major',
    'endoscopy',
    'biopsy',
    'injection',
    'infusion',
    'wound_care',
    'cardiovascular',
    'orthopedic',
    'neurological',
    'obstetric',
    'other',
  ];
}

// =============================================================================
// Get Ward Types
// =============================================================================

export function getWardTypes(): WardType[] {
  return [
    'general',
    'icu',
    'pediatric',
    'maternity',
    'surgical',
    'orthopedic',
    'cardiac',
    'emergency',
    'psychiatric',
    'isolation',
  ];
}

// =============================================================================
// Get Bed Types
// =============================================================================

export function getBedTypes(): BedType[] {
  return [
    'standard',
    'electric',
    'icu',
    'pediatric',
    'bariatric',
    'low',
    'stretcher',
    'crib',
    'bassinet',
  ];
}

// =============================================================================
// NHIS Coverage Management — Bulk & Individual Service Configuration
// =============================================================================

export type NhisServiceCategory = 'lab' | 'radiology' | 'pharmacy' | 'procedure' | 'consultation';

export interface NhisServiceItem {
  id: string;
  code: string;
  name: string;
  category: NhisServiceCategory;
  regular_price: number;
  nhis_price: number;
  nhis_code: string;
  is_nhis_covered: boolean;
  nhis_percentage: number;
  is_active: boolean;
}

/**
 * Get all NHIS-configurable services across categories for the coverage management UI.
 */
export async function getNhisServices(
  filters?: { category?: NhisServiceCategory; search?: string; nhisOnly?: boolean },
): Promise<NhisServiceItem[]> {
  const results: NhisServiceItem[] = [];
  const search = filters?.search ? sanitizeFilterValue(filters.search.toLowerCase()) : '';

  const cats = filters?.category ? [filters.category] : ['lab', 'radiology', 'pharmacy', 'procedure', 'consultation'] as NhisServiceCategory[];

  for (const cat of cats) {
    if (cat === 'lab') {
      let q = supabase
        .from('lab_test_catalogue')
        .select('id, code, name, price, nhis_code, nhis_price, is_nhis_covered, nhis_percentage, is_active')
        .eq('is_active', true)
        .order('name');
      if (search) q = q.ilike('name', `%${search}%`);
      if (filters?.nhisOnly) q = q.eq('is_nhis_covered', true);
      const { data } = await q;
      (data || []).forEach((r) =>
        results.push({ ...r, category: 'lab', regular_price: r.price, nhis_price: r.nhis_price || 0, nhis_code: r.nhis_code || '', nhis_percentage: r.nhis_percentage || 0, is_nhis_covered: r.is_nhis_covered ?? true }),
      );
    }

    if (cat === 'radiology') {
      let q = supabase
        .from('imaging_catalogue')
        .select('id, code, name, price, nhis_code, nhis_price, is_nhis_covered, nhis_percentage, is_active')
        .eq('is_active', true)
        .order('name');
      if (search) q = q.ilike('name', `%${search}%`);
      if (filters?.nhisOnly) q = q.eq('is_nhis_covered', true);
      const { data } = await q;
      (data || []).forEach((r) =>
        results.push({ ...r, category: 'radiology', regular_price: r.price, nhis_price: r.nhis_price || 0, nhis_code: r.nhis_code || '', nhis_percentage: r.nhis_percentage || 0, is_nhis_covered: r.is_nhis_covered ?? true }),
      );
    }

    if (cat === 'pharmacy') {
      let q = supabase
        .from('drug_catalogue')
        .select('id, code, name, selling_price, nhis_code, nhis_price, is_nhis_covered, nhis_percentage, is_active')
        .eq('is_active', true)
        .order('name');
      if (search) q = q.ilike('name', `%${search}%`);
      if (filters?.nhisOnly) q = q.eq('is_nhis_covered', true);
      const { data } = await q;
      (data || []).forEach((r) =>
        results.push({ ...r, category: 'pharmacy', regular_price: r.selling_price || 0, nhis_price: r.nhis_price || 0, nhis_code: r.nhis_code || '', nhis_percentage: r.nhis_percentage || 0, is_nhis_covered: r.is_nhis_covered ?? false }),
      );
    }

    if (cat === 'procedure') {
      let q = supabase
        .from('procedure_catalogue')
        .select('id, code, name, base_price, nhis_code, nhis_price, is_nhis_covered, nhis_percentage, is_active')
        .eq('is_active', true)
        .order('name');
      if (search) q = q.ilike('name', `%${search}%`);
      if (filters?.nhisOnly) q = q.eq('is_nhis_covered', true);
      const { data } = await q;
      (data || []).forEach((r) =>
        results.push({ ...r, category: 'procedure', regular_price: r.base_price || 0, nhis_price: r.nhis_price || 0, nhis_code: r.nhis_code || '', nhis_percentage: r.nhis_percentage || 0, is_nhis_covered: r.is_nhis_covered ?? true }),
      );
    }

    if (cat === 'consultation') {
      const { data } = await supabase
        .from('clinics')
        .select('id, clinic_name, consultation_fee, nhis_consultation_fee, follow_up_fee, nhis_follow_up_fee, emergency_fee, nhis_emergency_fee')
        .eq('is_active', true)
        .order('clinic_name');
      (data || []).forEach((c) => {
        const name = c.clinic_name || 'Unknown Clinic';
        if (!search || name.toLowerCase().includes(search)) {
          results.push({
            id: c.id,
            code: '',
            name: `${name} - Consultation`,
            category: 'consultation',
            regular_price: c.consultation_fee || 0,
            nhis_price: c.nhis_consultation_fee || c.consultation_fee || 0,
            nhis_code: '',
            is_nhis_covered: true,
            nhis_percentage: 100,
            is_active: true,
          });
          if (c.follow_up_fee && c.follow_up_fee > 0) {
            results.push({
              id: `${c.id}__followup`,
              code: '',
              name: `${name} - Follow Up`,
              category: 'consultation',
              regular_price: c.follow_up_fee || 0,
              nhis_price: c.nhis_follow_up_fee || c.follow_up_fee || 0,
              nhis_code: '',
              is_nhis_covered: true,
              nhis_percentage: 100,
              is_active: true,
            });
          }
          if (c.emergency_fee && c.emergency_fee > 0) {
            results.push({
              id: `${c.id}__emergency`,
              code: '',
              name: `${name} - Emergency`,
              category: 'consultation',
              regular_price: c.emergency_fee || 0,
              nhis_price: c.nhis_emergency_fee || c.emergency_fee || 0,
              nhis_code: '',
              is_nhis_covered: true,
              nhis_percentage: 100,
              is_active: true,
            });
          }
        }
      });
    }
  }

  return results;
}

/**
 * Bulk update NHIS percentage for selected services.
 */
export async function bulkUpdateNhisPercentage(
  items: Array<{ id: string; category: NhisServiceCategory }>,
  nhisPercentage: number,
  isNhisCovered?: boolean,
): Promise<{ updated: number; errors: string[] }> {
  let updated = 0;
  const errors: string[] = [];

  // Group by category for efficient batch updates
  const grouped = new Map<NhisServiceCategory, string[]>();
  for (const item of items) {
    const ids = grouped.get(item.category) || [];
    ids.push(item.id);
    grouped.set(item.category, ids);
  }

  for (const [cat, ids] of grouped) {
    if (cat === 'consultation') {
      // Consultations are always 100% for NHIS — skip bulk percentage change
      continue;
    }

    const table = cat === 'lab' ? 'lab_test_catalogue'
      : cat === 'radiology' ? 'imaging_catalogue'
      : cat === 'pharmacy' ? 'drug_catalogue'
      : cat === 'procedure' ? 'procedure_catalogue'
      : null;

    if (!table) continue;

    const updateData: Record<string, unknown> = {
      nhis_percentage: nhisPercentage,
      updated_at: new Date().toISOString(),
    };
    if (isNhisCovered !== undefined) {
      updateData.is_nhis_covered = isNhisCovered;
    }

    const { error, count } = await supabase
      .from(table)
      .update(updateData)
      .in('id', ids);

    if (error) {
      errors.push(`${cat}: ${error.message}`);
    } else {
      updated += count || ids.length;
    }
  }

  return { updated, errors };
}

/**
 * Update NHIS config for a single service.
 */
export async function updateServiceNhisConfig(
  id: string,
  category: NhisServiceCategory,
  updates: { nhis_price?: number; nhis_percentage?: number; is_nhis_covered?: boolean },
): Promise<void> {
  if (category === 'consultation') {
    // Consultation NHIS prices stored on clinics table
    const realId = id.replace(/__followup$/, '').replace(/__emergency$/, '');
    const isFollowUp = id.endsWith('__followup');
    const isEmergency = id.endsWith('__emergency');

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.nhis_price !== undefined) {
      if (isFollowUp) updateData.nhis_follow_up_fee = updates.nhis_price;
      else if (isEmergency) updateData.nhis_emergency_fee = updates.nhis_price;
      else updateData.nhis_consultation_fee = updates.nhis_price;
    }

    const { error } = await supabase.from('clinics').update(updateData).eq('id', realId);
    if (error) throw new Error(`Failed to update consultation NHIS config: ${error.message}`);
    return;
  }

  const table = category === 'lab' ? 'lab_test_catalogue'
    : category === 'radiology' ? 'imaging_catalogue'
    : category === 'pharmacy' ? 'drug_catalogue'
    : category === 'procedure' ? 'procedure_catalogue'
    : null;

  if (!table) throw new Error(`Unknown category: ${category}`);

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.nhis_price !== undefined) updateData.nhis_price = updates.nhis_price;
  if (updates.nhis_percentage !== undefined) updateData.nhis_percentage = updates.nhis_percentage;
  if (updates.is_nhis_covered !== undefined) updateData.is_nhis_covered = updates.is_nhis_covered;

  const { error } = await supabase.from(table).update(updateData).eq('id', id);
  if (error) throw new Error(`Failed to update NHIS config: ${error.message}`);
}
