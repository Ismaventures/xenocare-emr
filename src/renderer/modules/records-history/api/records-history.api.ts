/**
 * Records History Module - Data API
 * NDC MEDICAL CENTRE EMR
 *
 * Queries each clinical module's tables and normalises results into
 * the UnifiedRecord shape for the Records History page.
 */

import { supabase } from '../../../api/supabaseClient';
import type {
  RecordCategory,
  RecordsHistoryFilters,
  RecordsHistoryResponse,
  UnifiedRecord,
} from '../types/records-history.types';
import { RECORD_CATEGORIES } from '../types/records-history.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const labelFor = (cat: RecordCategory): string =>
  RECORD_CATEGORIES.find((c) => c.key === cat)?.label ?? cat;

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function formatName(first?: string | null, last?: string | null): string {
  return [first, last].filter(Boolean).join(' ') || '—';
}

/** Apply common date / search filters to a Supabase query builder. */
function applyCommonFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: RecordsHistoryFilters,
  dateCol: string,
) {
  if (filters.dateFrom) {
    query = query.gte(dateCol, filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte(dateCol, filters.dateTo + 'T23:59:59');
  }
  return query;
}

// ---------------------------------------------------------------------------
// Per-category fetch helpers
// ---------------------------------------------------------------------------

async function fetchEncounters(
  filters: RecordsHistoryFilters,
): Promise<UnifiedRecord[]> {
  let query = supabase
    .from('visits')
    .select(
      `id, visit_id, encounter_number, status, chief_complaint, visit_type,
       department, payment_category, created_at,
       patient:patients!visits_patient_id_fkey(id, first_name, surname, emr_number),
       doctor:staff!visits_attending_doctor_id_fkey(first_name, last_name)`,
    )
    .order('created_at', { ascending: false })
    .range(
      (filters.page - 1) * filters.pageSize,
      filters.page * filters.pageSize - 1,
    );

  query = applyCommonFilters(query, filters, 'created_at');
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.department) query = query.ilike('department', `%${filters.department}%`);
  if (filters.searchTerm) {
    query = query.or(
      `encounter_number.ilike.%${filters.searchTerm}%,chief_complaint.ilike.%${filters.searchTerm}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: Record<string, unknown>): UnifiedRecord => {
    const pat = r.patient as Record<string, unknown> | null;
    const doc = r.doctor as Record<string, unknown> | null;
    return {
      id: safeStr(r.visit_id || r.id),
      category: 'encounter',
      categoryLabel: labelFor('encounter'),
      patientId: safeStr(pat?.id),
      patientName: formatName(
        safeStr(pat?.first_name),
        safeStr(pat?.surname),
      ),
      emrNumber: safeStr(pat?.emr_number),
      encounterId: safeStr(r.id),
      date: safeStr(r.created_at),
      title: safeStr(r.visit_type || 'Visit'),
      description: safeStr(r.chief_complaint || '—'),
      status: safeStr(r.status),
      department: safeStr(r.department),
      staffName: formatName(
        safeStr(doc?.first_name),
        safeStr(doc?.last_name),
      ),
      nhisRelated: safeStr(r.payment_category).toLowerCase().includes('nhis'),
    };
  });
}

async function fetchConsultations(
  filters: RecordsHistoryFilters,
): Promise<UnifiedRecord[]> {
  let query = supabase
    .from('consultations')
    .select(
      `id, consultation_id, consultation_type, status, primary_diagnosis, notes,
       department, created_at,
       patient:patients!consultations_patient_id_fkey(id, first_name, surname, emr_number),
       clinician:staff!consultations_clinician_id_fkey(first_name, last_name)`,
    )
    .order('created_at', { ascending: false })
    .range(
      (filters.page - 1) * filters.pageSize,
      filters.page * filters.pageSize - 1,
    );

  query = applyCommonFilters(query, filters, 'created_at');
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.searchTerm) {
    query = query.or(
      `consultation_id.ilike.%${filters.searchTerm}%,primary_diagnosis.ilike.%${filters.searchTerm}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: Record<string, unknown>): UnifiedRecord => {
    const pat = r.patient as Record<string, unknown> | null;
    const doc = r.clinician as Record<string, unknown> | null;
    return {
      id: safeStr(r.consultation_id || r.id),
      category: 'consultation',
      categoryLabel: labelFor('consultation'),
      patientId: safeStr(pat?.id),
      patientName: formatName(safeStr(pat?.first_name), safeStr(pat?.surname)),
      emrNumber: safeStr(pat?.emr_number),
      date: safeStr(r.created_at),
      title: safeStr(r.consultation_type || 'Consultation'),
      description: safeStr(r.primary_diagnosis || r.notes || '—'),
      status: safeStr(r.status),
      department: safeStr(r.department),
      staffName: formatName(safeStr(doc?.first_name), safeStr(doc?.last_name)),
      nhisRelated: false,
    };
  });
}

async function fetchLabRecords(
  filters: RecordsHistoryFilters,
): Promise<UnifiedRecord[]> {
  let query = supabase
    .from('lab_requests')
    .select(
      `id, request_id, test_name, test_id, status, priority, department,
       diagnosis, created_at,
       patient:patients!lab_requests_patient_id_fkey(id, first_name, surname, emr_number),
       requestor:staff!lab_requests_requested_by_fkey(first_name, last_name)`,
    )
    .order('created_at', { ascending: false })
    .range(
      (filters.page - 1) * filters.pageSize,
      filters.page * filters.pageSize - 1,
    );

  query = applyCommonFilters(query, filters, 'created_at');
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.searchTerm) {
    query = query.or(
      `test_name.ilike.%${filters.searchTerm}%,request_id.ilike.%${filters.searchTerm}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: Record<string, unknown>): UnifiedRecord => {
    const pat = r.patient as Record<string, unknown> | null;
    const doc = r.requestor as Record<string, unknown> | null;
    return {
      id: safeStr(r.request_id || r.id),
      category: 'lab',
      categoryLabel: labelFor('lab'),
      patientId: safeStr(pat?.id),
      patientName: formatName(safeStr(pat?.first_name), safeStr(pat?.surname)),
      emrNumber: safeStr(pat?.emr_number),
      date: safeStr(r.created_at),
      title: safeStr(r.test_name || r.test_id || 'Lab Test'),
      description: safeStr(r.diagnosis || '—'),
      status: safeStr(r.status),
      department: safeStr(r.department),
      staffName: formatName(safeStr(doc?.first_name), safeStr(doc?.last_name)),
      nhisRelated: false,
    };
  });
}

async function fetchRadiologyRecords(
  filters: RecordsHistoryFilters,
): Promise<UnifiedRecord[]> {
  let query = supabase
    .from('radiology_requests')
    .select(
      `id, request_id, exam_type, modality, status, priority,
       clinical_info, created_at,
       patient:patients!radiology_requests_patient_id_fkey(id, first_name, surname, emr_number),
       requestor:staff!radiology_requests_requested_by_fkey(first_name, last_name)`,
    )
    .order('created_at', { ascending: false })
    .range(
      (filters.page - 1) * filters.pageSize,
      filters.page * filters.pageSize - 1,
    );

  query = applyCommonFilters(query, filters, 'created_at');
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.searchTerm) {
    query = query.or(
      `exam_type.ilike.%${filters.searchTerm}%,request_id.ilike.%${filters.searchTerm}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: Record<string, unknown>): UnifiedRecord => {
    const pat = r.patient as Record<string, unknown> | null;
    const doc = r.requestor as Record<string, unknown> | null;
    return {
      id: safeStr(r.request_id || r.id),
      category: 'radiology',
      categoryLabel: labelFor('radiology'),
      patientId: safeStr(pat?.id),
      patientName: formatName(safeStr(pat?.first_name), safeStr(pat?.surname)),
      emrNumber: safeStr(pat?.emr_number),
      date: safeStr(r.created_at),
      title: safeStr(r.exam_type || r.modality || 'Imaging'),
      description: safeStr(r.clinical_info || '—'),
      status: safeStr(r.status),
      department: '',
      staffName: formatName(safeStr(doc?.first_name), safeStr(doc?.last_name)),
      nhisRelated: false,
    };
  });
}

async function fetchPharmacyRecords(
  filters: RecordsHistoryFilters,
): Promise<UnifiedRecord[]> {
  let query = supabase
    .from('prescriptions')
    .select(
      `id, prescription_id, drug_name, dosage, status, quantity,
       created_at,
       patient:patients!prescriptions_patient_id_fkey(id, first_name, surname, emr_number),
       prescriber:staff!prescriptions_prescribed_by_fkey(first_name, last_name)`,
    )
    .order('created_at', { ascending: false })
    .range(
      (filters.page - 1) * filters.pageSize,
      filters.page * filters.pageSize - 1,
    );

  query = applyCommonFilters(query, filters, 'created_at');
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.searchTerm) {
    query = query.or(
      `drug_name.ilike.%${filters.searchTerm}%,prescription_id.ilike.%${filters.searchTerm}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: Record<string, unknown>): UnifiedRecord => {
    const pat = r.patient as Record<string, unknown> | null;
    const doc = r.prescriber as Record<string, unknown> | null;
    return {
      id: safeStr(r.prescription_id || r.id),
      category: 'pharmacy',
      categoryLabel: labelFor('pharmacy'),
      patientId: safeStr(pat?.id),
      patientName: formatName(safeStr(pat?.first_name), safeStr(pat?.surname)),
      emrNumber: safeStr(pat?.emr_number),
      date: safeStr(r.created_at),
      title: safeStr(r.drug_name || 'Prescription'),
      description: `${safeStr(r.dosage)} × ${safeStr(r.quantity)}`,
      status: safeStr(r.status),
      department: '',
      staffName: formatName(safeStr(doc?.first_name), safeStr(doc?.last_name)),
      nhisRelated: false,
    };
  });
}

async function fetchPhysiotherapyRecords(
  filters: RecordsHistoryFilters,
): Promise<UnifiedRecord[]> {
  let query = supabase
    .from('physio_sessions')
    .select(
      `id, session_number, status, session_type, soap_subjective,
       soap_assessment, therapist_notes, session_date, created_at,
       patient:patients!physio_sessions_patient_id_fkey(id, first_name, surname, emr_number),
       therapist:staff!physio_sessions_therapist_id_fkey(first_name, last_name)`,
    )
    .order('created_at', { ascending: false })
    .range(
      (filters.page - 1) * filters.pageSize,
      filters.page * filters.pageSize - 1,
    );

  query = applyCommonFilters(query, filters, 'created_at');
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.searchTerm) {
    query = query.or(
      `soap_subjective.ilike.%${filters.searchTerm}%,soap_assessment.ilike.%${filters.searchTerm}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: Record<string, unknown>): UnifiedRecord => {
    const pat = r.patient as Record<string, unknown> | null;
    const doc = r.therapist as Record<string, unknown> | null;
    return {
      id: safeStr(r.id),
      category: 'physiotherapy',
      categoryLabel: labelFor('physiotherapy'),
      patientId: safeStr(pat?.id),
      patientName: formatName(safeStr(pat?.first_name), safeStr(pat?.surname)),
      emrNumber: safeStr(pat?.emr_number),
      date: safeStr(r.session_date || r.created_at),
      title: `Session #${safeStr(r.session_number)} — ${safeStr(r.session_type || 'PT')}`,
      description: safeStr(r.soap_assessment || r.therapist_notes || '—'),
      status: safeStr(r.status),
      department: 'Physiotherapy',
      staffName: formatName(safeStr(doc?.first_name), safeStr(doc?.last_name)),
      nhisRelated: false,
    };
  });
}

async function fetchNursingRecords(
  filters: RecordsHistoryFilters,
): Promise<UnifiedRecord[]> {
  let query = supabase
    .from('nursing_notes')
    .select(
      `id, note_type, notes, patient_condition, pain_score, created_at,
       patient:patients!nursing_notes_patient_id_fkey(id, first_name, surname, emr_number),
       nurse:staff!nursing_notes_nurse_id_fkey(first_name, last_name)`,
    )
    .order('created_at', { ascending: false })
    .range(
      (filters.page - 1) * filters.pageSize,
      filters.page * filters.pageSize - 1,
    );

  query = applyCommonFilters(query, filters, 'created_at');
  if (filters.searchTerm) {
    query = query.or(
      `notes.ilike.%${filters.searchTerm}%,note_type.ilike.%${filters.searchTerm}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: Record<string, unknown>): UnifiedRecord => {
    const pat = r.patient as Record<string, unknown> | null;
    const nurse = r.nurse as Record<string, unknown> | null;
    return {
      id: safeStr(r.id),
      category: 'nursing',
      categoryLabel: labelFor('nursing'),
      patientId: safeStr(pat?.id),
      patientName: formatName(safeStr(pat?.first_name), safeStr(pat?.surname)),
      emrNumber: safeStr(pat?.emr_number),
      date: safeStr(r.created_at),
      title: safeStr(r.note_type || 'Nursing Note'),
      description: safeStr(r.notes || '—').slice(0, 120),
      status: safeStr(r.patient_condition || '—'),
      department: 'Nursing',
      staffName: formatName(safeStr(nurse?.first_name), safeStr(nurse?.last_name)),
      nhisRelated: false,
    };
  });
}

async function fetchProcedureRecords(
  filters: RecordsHistoryFilters,
): Promise<UnifiedRecord[]> {
  let query = supabase
    .from('clinical_requests')
    .select(
      `id, request_type, specialty_module, status, clinical_reason,
       urgency, created_at,
       patient:patients!clinical_requests_patient_id_fkey(id, first_name, surname, emr_number),
       requestor:staff!clinical_requests_requested_by_fkey(first_name, last_name)`,
    )
    .in('request_type', ['Procedure', 'Surgery'])
    .order('created_at', { ascending: false })
    .range(
      (filters.page - 1) * filters.pageSize,
      filters.page * filters.pageSize - 1,
    );

  query = applyCommonFilters(query, filters, 'created_at');
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.searchTerm) {
    query = query.or(
      `clinical_reason.ilike.%${filters.searchTerm}%,specialty_module.ilike.%${filters.searchTerm}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: Record<string, unknown>): UnifiedRecord => {
    const pat = r.patient as Record<string, unknown> | null;
    const doc = r.requestor as Record<string, unknown> | null;
    return {
      id: safeStr(r.id),
      category: 'procedure',
      categoryLabel: labelFor('procedure'),
      patientId: safeStr(pat?.id),
      patientName: formatName(safeStr(pat?.first_name), safeStr(pat?.surname)),
      emrNumber: safeStr(pat?.emr_number),
      date: safeStr(r.created_at),
      title: `${safeStr(r.request_type)} — ${safeStr(r.specialty_module || 'General')}`,
      description: safeStr(r.clinical_reason || '—'),
      status: safeStr(r.status),
      department: safeStr(r.specialty_module),
      staffName: formatName(safeStr(doc?.first_name), safeStr(doc?.last_name)),
      nhisRelated: false,
    };
  });
}

async function fetchAdmissionRecords(
  filters: RecordsHistoryFilters,
): Promise<UnifiedRecord[]> {
  let query = supabase
    .from('admissions')
    .select(
      `id, admission_number, admission_type, status, ward_name,
       bed_number, diagnosis, admitted_at, created_at,
       patient:patients!admissions_patient_id_fkey(id, first_name, surname, emr_number),
       doctor:staff!admissions_admitting_doctor_id_fkey(first_name, last_name)`,
    )
    .order('created_at', { ascending: false })
    .range(
      (filters.page - 1) * filters.pageSize,
      filters.page * filters.pageSize - 1,
    );

  query = applyCommonFilters(query, filters, 'created_at');
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.searchTerm) {
    query = query.or(
      `admission_number.ilike.%${filters.searchTerm}%,diagnosis.ilike.%${filters.searchTerm}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: Record<string, unknown>): UnifiedRecord => {
    const pat = r.patient as Record<string, unknown> | null;
    const doc = r.doctor as Record<string, unknown> | null;
    return {
      id: safeStr(r.admission_number || r.id),
      category: 'admission',
      categoryLabel: labelFor('admission'),
      patientId: safeStr(pat?.id),
      patientName: formatName(safeStr(pat?.first_name), safeStr(pat?.surname)),
      emrNumber: safeStr(pat?.emr_number),
      date: safeStr(r.admitted_at || r.created_at),
      title: `${safeStr(r.admission_type || 'Admission')} — ${safeStr(r.ward_name || '')}`,
      description: safeStr(r.diagnosis || '—'),
      status: safeStr(r.status),
      department: safeStr(r.ward_name),
      staffName: formatName(safeStr(doc?.first_name), safeStr(doc?.last_name)),
      nhisRelated: false,
    };
  });
}

async function fetchBillingRecords(
  filters: RecordsHistoryFilters,
): Promise<UnifiedRecord[]> {
  let query = supabase
    .from('billing_orders')
    .select(
      `id, order_number, status, total_amount, payment_status,
       payment_category, created_at,
       patient:patients!billing_orders_patient_id_fkey(id, first_name, surname, emr_number),
       created_by_staff:staff!billing_orders_created_by_fkey(first_name, last_name)`,
    )
    .order('created_at', { ascending: false })
    .range(
      (filters.page - 1) * filters.pageSize,
      filters.page * filters.pageSize - 1,
    );

  query = applyCommonFilters(query, filters, 'created_at');
  if (filters.status) query = query.eq('payment_status', filters.status);
  if (filters.searchTerm) {
    query = query.or(
      `order_number.ilike.%${filters.searchTerm}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: Record<string, unknown>): UnifiedRecord => {
    const pat = r.patient as Record<string, unknown> | null;
    const staff = r.created_by_staff as Record<string, unknown> | null;
    const amt = Number(r.total_amount) || 0;
    return {
      id: safeStr(r.order_number || r.id),
      category: 'billing',
      categoryLabel: labelFor('billing'),
      patientId: safeStr(pat?.id),
      patientName: formatName(safeStr(pat?.first_name), safeStr(pat?.surname)),
      emrNumber: safeStr(pat?.emr_number),
      date: safeStr(r.created_at),
      title: `Invoice ${safeStr(r.order_number)}`,
      description: `₦${amt.toLocaleString()} — ${safeStr(r.payment_category || 'Cash')}`,
      status: safeStr(r.payment_status || r.status),
      department: '',
      staffName: formatName(safeStr(staff?.first_name), safeStr(staff?.last_name)),
      amount: amt,
      nhisRelated: safeStr(r.payment_category).toLowerCase().includes('nhis'),
    };
  });
}

async function fetchNhisClaimRecords(
  filters: RecordsHistoryFilters,
): Promise<UnifiedRecord[]> {
  let query = supabase
    .from('nhis_approvals')
    .select(
      `id, service_type, status, authorization_code, decision,
       requested_reason, created_at,
       patient:patients!nhis_approvals_patient_id_fkey(id, first_name, surname, emr_number),
       requested_by_staff:staff!nhis_approvals_requested_by_fkey(first_name, last_name)`,
    )
    .order('created_at', { ascending: false })
    .range(
      (filters.page - 1) * filters.pageSize,
      filters.page * filters.pageSize - 1,
    );

  query = applyCommonFilters(query, filters, 'created_at');
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.searchTerm) {
    query = query.or(
      `service_type.ilike.%${filters.searchTerm}%,authorization_code.ilike.%${filters.searchTerm}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: Record<string, unknown>): UnifiedRecord => {
    const pat = r.patient as Record<string, unknown> | null;
    const staff = r.requested_by_staff as Record<string, unknown> | null;
    return {
      id: safeStr(r.id),
      category: 'nhis_claim',
      categoryLabel: labelFor('nhis_claim'),
      patientId: safeStr(pat?.id),
      patientName: formatName(safeStr(pat?.first_name), safeStr(pat?.surname)),
      emrNumber: safeStr(pat?.emr_number),
      date: safeStr(r.created_at),
      title: safeStr(r.service_type || 'NHIS Approval'),
      description: safeStr(r.requested_reason || '—'),
      status: safeStr(r.decision || r.status),
      department: '',
      staffName: formatName(safeStr(staff?.first_name), safeStr(staff?.last_name)),
      nhisRelated: true,
    };
  });
}

// ---------------------------------------------------------------------------
// Category → fetch function map
// ---------------------------------------------------------------------------

const CATEGORY_FETCHERS: Record<
  RecordCategory,
  (f: RecordsHistoryFilters) => Promise<UnifiedRecord[]>
> = {
  encounter: fetchEncounters,
  consultation: fetchConsultations,
  lab: fetchLabRecords,
  radiology: fetchRadiologyRecords,
  pharmacy: fetchPharmacyRecords,
  physiotherapy: fetchPhysiotherapyRecords,
  nursing: fetchNursingRecords,
  procedure: fetchProcedureRecords,
  dental: fetchConsultations, // dental consultations reuse consultations table
  ophthalmology: fetchConsultations, // ophthalmology reuses consultations table
  anc: fetchEncounters, // anc visits are stored as encounters with department filter
  admission: fetchAdmissionRecords,
  billing: fetchBillingRecords,
  nhis_claim: fetchNhisClaimRecords,
  specialty: fetchConsultations,
};

// ---------------------------------------------------------------------------
// Main entry point — used by the React Query hook
// ---------------------------------------------------------------------------

export async function fetchRecordsHistory(
  filters: RecordsHistoryFilters,
): Promise<RecordsHistoryResponse> {
  if (filters.category !== 'all') {
    const fetcher = CATEGORY_FETCHERS[filters.category];
    if (!fetcher) return { data: [], totalCount: 0 };

    const data = await fetcher(filters);
    return { data, totalCount: data.length };
  }

  // "All" tab — fetch from every category in parallel (limited page size
  // per-category to keep the response snappy).
  const perCatFilters: RecordsHistoryFilters = {
    ...filters,
    pageSize: Math.max(5, Math.floor(filters.pageSize / 6)),
  };

  const categories: RecordCategory[] = [
    'encounter',
    'consultation',
    'lab',
    'radiology',
    'pharmacy',
    'physiotherapy',
    'nursing',
    'procedure',
    'admission',
    'billing',
    'nhis_claim',
  ];

  const results = await Promise.allSettled(
    categories.map((cat) =>
      CATEGORY_FETCHERS[cat]({ ...perCatFilters, category: cat }),
    ),
  );

  const combined: UnifiedRecord[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') combined.push(...r.value);
  }

  // Sort by date descending
  combined.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return { data: combined, totalCount: combined.length };
}
