import { supabase } from '../../../api/supabaseClient';
import {
  PatientDTO,
  CreatePatientDTO,
  UpdatePatientDTO,
  PatientSearchParams,
  PatientSearchResult,
} from '../dtos/patient.dto';

const ITEMS_PER_PAGE = 20;
const EXPORT_BATCH_SIZE = 500;

type DuplicateCandidate = Pick<
  PatientDTO,
  'patient_id' | 'first_name' | 'surname' | 'date_of_birth' | 'contact_phone'
>;

const DUPLICATE_PATIENT_SELECT =
  'patient_id, first_name, surname, date_of_birth, contact_phone';

async function findPotentialDuplicatePatients(
  patient: CreatePatientDTO,
): Promise<DuplicateCandidate[]> {
  const duplicateMap = new Map<string, DuplicateCandidate>();
  const normalizedFirstName = patient.first_name.trim();
  const normalizedSurname = patient.surname.trim();
  const normalizedDob = patient.date_of_birth?.trim();
  const normalizedPhone = patient.contact_phone?.trim();
  const normalizedNhisNumber = patient.nhis_number?.trim();
  const normalizedServiceNumber = patient.service_number?.trim();

  const checks: Array<
    PromiseLike<{
      data: DuplicateCandidate[] | null;
      error: { message: string } | null;
    }>
  > = [];

  if (normalizedPhone) {
    checks.push(
      supabase
        .from('patients')
        .select(DUPLICATE_PATIENT_SELECT)
        .eq('contact_phone', normalizedPhone)
        .ilike('first_name', normalizedFirstName)
        .ilike('surname', normalizedSurname)
        .limit(5),
    );
  }

  if (normalizedNhisNumber) {
    checks.push(
      supabase
        .from('patients')
        .select(DUPLICATE_PATIENT_SELECT)
        .eq('nhis_number', normalizedNhisNumber)
        .limit(5),
    );
  }

  if (normalizedServiceNumber) {
    checks.push(
      supabase
        .from('patients')
        .select(DUPLICATE_PATIENT_SELECT)
        .eq('service_number', normalizedServiceNumber)
        .limit(5),
    );
  }

  if (normalizedDob) {
    checks.push(
      supabase
        .from('patients')
        .select(DUPLICATE_PATIENT_SELECT)
        .ilike('first_name', normalizedFirstName)
        .ilike('surname', normalizedSurname)
        .eq('date_of_birth', normalizedDob)
        .limit(5),
    );
  }

  if (checks.length === 0) {
    return [];
  }

  const results = await Promise.all(checks);
  results.forEach(({ data, error }) => {
    if (error) {
      throw error;
    }

    (data || []).forEach((candidate) => {
      duplicateMap.set(candidate.patient_id, candidate);
    });
  });

  return Array.from(duplicateMap.values());
}

interface PatientQueryBuilder<T> {
  or(filters: string): T;
  eq(column: string, value: string): T;
  gte(column: string, value: string): T;
  lte(column: string, value: string): T;
  order(column: string, options: { ascending: boolean }): T;
  range(from: number, to: number): T;
}

function getPatientSearchClause(rawQuery?: string): string | null {
  if (!rawQuery?.trim()) {
    return null;
  }

  const cleanQuery = rawQuery.trim();
  const searchQuery = `%${cleanQuery}%`;
  const emrPatterns = [`emr_number.ilike.${searchQuery}`];

  if (/^\d+$/.test(cleanQuery)) {
    // Support legacy NDC-0001 and MHC-000001 formats.
    const padded4 = cleanQuery.padStart(4, '0');
    const padded6 = cleanQuery.padStart(6, '0');
    emrPatterns.push(`emr_number.ilike.%-${padded4}`);
    emrPatterns.push(`emr_number.ilike.%-${padded6}`);
  }

  return [
    ...emrPatterns,
    `first_name.ilike.${searchQuery}`,
    `surname.ilike.${searchQuery}`,
    `contact_phone.ilike.${searchQuery}`,
    `service_number.ilike.${searchQuery}`,
  ].join(',');
}

function toDateBoundaryIso(
  rawDate: string | undefined,
  boundary: 'start' | 'end',
): string | null {
  if (!rawDate) {
    return null;
  }

  const timestamp =
    boundary === 'start'
      ? `${rawDate}T00:00:00.000`
      : `${rawDate}T23:59:59.999`;
  const parsedDate = new Date(timestamp);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

function applyPatientFilters<T extends PatientQueryBuilder<T>>(
  query: T,
  params?: PatientSearchParams,
): T {
  const searchClause = getPatientSearchClause(params?.query);
  if (searchClause) {
    query = query.or(searchClause);
  }

  if (params?.status) {
    query = query.eq('status', params.status);
  }

  if (params?.staff_category) {
    query = query.eq('staff_category', params.staff_category);
  }

  if (params?.patient_category) {
    query = query.eq('patient_category', params.patient_category);
  }

  if (params?.patient_type) {
    query = query.eq('patient_type', params.patient_type);
  }

  if (params?.insurance_type) {
    query = query.eq('insurance_type', params.insurance_type);
  }

  if (params?.nhis_patient_source) {
    query = query.eq('nhis_patient_source', params.nhis_patient_source);
  }

  if (params?.gender) {
    query = query.eq('gender', params.gender);
  }

  const registrationDateFrom = toDateBoundaryIso(
    params?.registration_date_from,
    'start',
  );
  if (registrationDateFrom) {
    query = query.gte('registration_date', registrationDateFrom);
  }

  const registrationDateTo = toDateBoundaryIso(
    params?.registration_date_to,
    'end',
  );
  if (registrationDateTo) {
    query = query.lte('registration_date', registrationDateTo);
  }

  return query;
}

// =============================================================================
// Get All Patients (with optional search/filter)
// =============================================================================

export const getPatients = async (
  params?: PatientSearchParams,
): Promise<PatientSearchResult> => {
  const page = params?.page || 1;
  const limit = params?.limit || ITEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  let query = applyPatientFilters(
    supabase.from('patients').select('*', { count: 'exact' }),
    params,
  );

  // Apply pagination and ordering
  query = query
    .order('registration_date', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    patients: data as PatientDTO[],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
};

export const getPatientsForExport = async (
  params?: PatientSearchParams,
): Promise<PatientDTO[]> => {
  const patients: PatientDTO[] = [];
  let offset = 0;
  let totalCount: number | null = null;

  while (totalCount === null || offset < totalCount) {
    let query = applyPatientFilters(
      supabase.from('patients').select('*', { count: 'exact' }),
      params,
    );

    query = query
      .order('registration_date', { ascending: false })
      .range(offset, offset + EXPORT_BATCH_SIZE - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const batch = (data || []) as PatientDTO[];
    patients.push(...batch);

    totalCount = count ?? patients.length;
    if (batch.length < EXPORT_BATCH_SIZE) {
      break;
    }

    offset += EXPORT_BATCH_SIZE;
  }

  return patients;
};

// =============================================================================
// Dependents / Principal helpers
// =============================================================================

export const getDependentsByPrincipal = async (
  principalId: string,
): Promise<PatientDTO[]> => {
  const { data, error } = await supabase
    .from('patients')
    .select(
      'id, patient_id, first_name, middle_name, surname, gender, date_of_birth, contact_phone, status, patient_type, principal_id, relationship_to_principal, emr_number',
    )
    .eq('principal_id', principalId)
    .eq('patient_type', 'Dependent')
    .order('surname', { ascending: true });

  if (error) throw error;
  return data as unknown as PatientDTO[];
};

// =============================================================================
// Get All Patients (Simple - for dropdowns)
// =============================================================================

export const getAllPatients = async (): Promise<PatientDTO[]> => {
  const { data, error } = await supabase
    .from('patients')
    .select(
      'id, patient_id, first_name, surname, middle_name, contact_phone, service_number',
    )
    .eq('status', 'Active')
    .order('surname', { ascending: true })
    .limit(100); // Limit to prevent loading thousands of records

  if (error) throw error;
  return data as unknown as PatientDTO[];
};

// =============================================================================
// Get Patient by ID
// =============================================================================

export const getPatientById = async (
  id: string,
): Promise<PatientDTO | null> => {
  // Check if id is a UUID
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Most callers pass patient_id. Try that first to avoid false negatives.
  const byPatientId = await supabase
    .from('patients')
    .select('*')
    .eq('patient_id', id)
    .maybeSingle();

  if (byPatientId.error) throw byPatientId.error;
  if (byPatientId.data) return byPatientId.data as PatientDTO;

  // Fallback: some screens may still pass the internal patients.id UUID.
  if (isUuid) {
    const byInternalId = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (byInternalId.error) throw byInternalId.error;
    if (byInternalId.data) return byInternalId.data as PatientDTO;
  }

  return null;
};

// =============================================================================
// Create Patient
// =============================================================================

export const createPatient = async (
  patient: CreatePatientDTO,
): Promise<PatientDTO> => {
  // Remove fields that should be auto-generated by the database
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { emr_number, patient_id, ...patientData } =
    patient as CreatePatientDTO & { patient_id?: string; emr_number?: string };

  const potentialDuplicates = await findPotentialDuplicatePatients(patient);
  if (potentialDuplicates.length > 0) {
    throw new Error(
      'A matching patient record already exists. Search existing records before creating a new patient.',
    );
  }

  // Date fields that need special handling (empty string -> null)
  const dateFields = [
    'date_of_birth',
    'referral_date',
    'referral_expiry_date',
    'registration_date',
    'nhis_validity_start',
    'nhis_validity_end',
  ];

  // Remove undefined values and empty strings to prevent null being sent to DB
  const cleanedData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patientData)) {
    // Skip auto-generated fields
    if (key === 'patient_id' || key === 'emr_number') continue;
    // Skip undefined and null
    if (value === undefined || value === null) continue;
    // For date fields, skip empty strings (they would cause DB error)
    if (dateFields.includes(key) && value === '') continue;
    // For non-date fields, skip empty strings
    if (value === '') continue;
    cleanedData[key] = value;
  }

  // Double-check these are not present
  delete (cleanedData as Record<string, unknown>).patient_id;
  delete (cleanedData as Record<string, unknown>).emr_number;

  const { data, error } = await supabase
    .from('patients')
    .insert([
      {
        ...cleanedData,
        registration_date: new Date().toISOString(),
        status: 'Active',
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as PatientDTO;
};

// =============================================================================
// Update Patient
// =============================================================================

export const updatePatient = async (
  patient: UpdatePatientDTO,
): Promise<PatientDTO> => {
  const { patient_id, ...updates } = patient;

  // Clean the updates - convert empty strings to null for date fields
  // and remove undefined values
  const cleanedUpdates: Record<string, unknown> = {};
  const dateFields = [
    'date_of_birth',
    'referral_date',
    'referral_expiry_date',
    'registration_date',
    'nhis_validity_start',
    'nhis_validity_end',
  ];

  for (const [key, value] of Object.entries(updates)) {
    // Skip undefined values
    if (value === undefined) continue;

    // Convert empty strings to null for date fields
    if (dateFields.includes(key) && value === '') {
      cleanedUpdates[key] = null;
    } else {
      cleanedUpdates[key] = value;
    }
  }

  const { data, error } = await supabase
    .from('patients')
    .update({
      ...cleanedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('patient_id', patient_id)
    .select()
    .single();

  if (error) throw error;
  return data as PatientDTO;
};

// =============================================================================
// Delete Patient (Soft delete - set status to Inactive)
// =============================================================================

export const deletePatient = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('patients')
    .update({ status: 'Inactive', updated_at: new Date().toISOString() })
    .eq('patient_id', id);

  if (error) throw error;
};

// =============================================================================
// Search Patients (Quick search for autocomplete)
// Supports: name, phone, EMR number (full or partial), service number
// Examples: "NDC-0001", "0001", "1", "John", "08012345678"
// =============================================================================

export const searchPatients = async (
  query: string,
  limit = 10,
): Promise<PatientDTO[]> => {
  if (!query || query.length < 1) return [];

  // Clean the query
  const cleanQuery = query.trim();

  // Build search patterns
  const searchQuery = `%${cleanQuery}%`;

  // For numeric queries, support both legacy 4-digit and current 6-digit EMR formats.
  const emrConditions = [`emr_number.ilike.${searchQuery}`];

  if (/^\d+$/.test(cleanQuery)) {
    const padded4 = cleanQuery.padStart(4, '0');
    const padded6 = cleanQuery.padStart(6, '0');
    emrConditions.push(`emr_number.ilike.%-${padded4}`);
    emrConditions.push(`emr_number.ilike.%-${padded6}`);
  }

  const { data, error } = await supabase
    .from('patients')
    .select(
      'id, patient_id, first_name, middle_name, surname, contact_phone, service_number, status, emr_number, patient_category, date_of_birth, insurance_type, nhis_patient_source',
    )
    .eq('status', 'Active')
    .or(
      [
        `first_name.ilike.${searchQuery}`,
        `surname.ilike.${searchQuery}`,
        `middle_name.ilike.${searchQuery}`,
        `service_number.ilike.${searchQuery}`,
        `contact_phone.ilike.${searchQuery}`,
        ...emrConditions,
      ].join(','),
    )
    .limit(limit);

  if (error) throw error;

  // Debug logging - log full response
  console.log(
    '[searchPatients] Query:',
    cleanQuery,
    'Raw data:',
    JSON.stringify(data, null, 2),
  );
  console.log(
    '[searchPatients] Results:',
    data?.map((p) => ({
      name: `${p.first_name} ${p.surname}`,
      nhis_patient_source: p.nhis_patient_source,
    })),
  );

  return data as unknown as PatientDTO[];
};

// =============================================================================
// Get Patient Statistics
// =============================================================================

export interface PatientStats {
  total: number;
  active: number;
  inactive: number;
  byCategory: Record<string, number>;
  registeredToday: number;
  registeredThisMonth: number;
  encounters: number;
  nhisRegistered: number;
  privateRegistered: number;
  externalReferrals: number;
  growth: { name: string; value: number }[];
}

export const getPatientStats = async (): Promise<PatientStats> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Get counts
  const { count: total } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });

  const { count: active } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Active');

  const { count: registeredToday } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .gte('registration_date', today.toISOString());

  const { count: registeredThisMonth } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .gte('registration_date', firstOfMonth.toISOString());

  // Additional stats
  const { count: nhisCount } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .neq('insurance_type', 'Private');

  const { count: privateCount } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('insurance_type', 'Private');

  const { count: referralCount } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('nhis_patient_source', 'Referral');

  const { count: encountersCount } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Active');

  // Get category breakdown
  const { data: categoryData } = await supabase
    .from('patients')
    .select('staff_category')
    .eq('status', 'Active');

  const byCategory: Record<string, number> = {};
  categoryData?.forEach((p) => {
    const cat = p.staff_category || 'None';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  return {
    total: total || 0,
    active: active || 0,
    inactive: (total || 0) - (active || 0),
    byCategory,
    registeredToday: registeredToday || 0,
    registeredThisMonth: registeredThisMonth || 0,
    encounters: encountersCount || 0,
    nhisRegistered: nhisCount || 0,
    privateRegistered: privateCount || 0,
    externalReferrals: referralCount || 0,
    growth: [], // Todo: Implement growth chart data logic as needed
  };
};

// =============================================================================
// Get Payer Schemes
// =============================================================================

export interface PayerScheme {
  name: string;
  hmo_code: string | null;
  display_name: string;
}

export const getPayerSchemes = async (): Promise<PayerScheme[]> => {
  const { data, error } = await supabase
    .from('nhis_hmos')
    .select('name, hmo_code')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map((item) => ({
    name: item.name || '',
    hmo_code: item.hmo_code || null,
    display_name:
      `${item.name || ''} ${item.hmo_code ? `(${item.hmo_code})` : ''}`.trim(),
  }));
};
