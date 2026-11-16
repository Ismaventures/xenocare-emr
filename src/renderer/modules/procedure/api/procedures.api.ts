// =============================================================================
// XENOCARE EMR - Procedures API
// Supabase API functions for procedure management
// =============================================================================

import { supabase } from '../../../api/supabaseClient';
import { sanitizeFilterValue } from '../../../lib/filterSanitizer';
import type {
  Procedure,
  ProcedureStatus,
  ProcedurePriority,
  TodaysProcedureView,
  CreateProcedureDTO,
  UpdateProcedureDTO,
  PreOpChecklist,
} from '../../../types/database.types';

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get today's scheduled procedures - queries procedures table directly
 */
export async function getTodaysProcedures(facilityId: string) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('procedures')
    .select(
      `
      id,
      procedure_number,
      procedure_name,
      scheduled_date,
      scheduled_duration_minutes,
      priority,
      status,
      location,
      room_number,
      anesthesia_type,
      facility_id,
      patient_id,
      patient:patients(id, first_name, surname, emr_number),
      primary_surgeon:staff!procedures_primary_surgeon_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('facility_id', facilityId)
    .gte('scheduled_date', today)
    .lt('scheduled_date', tomorrow)
    .order('scheduled_date');

  if (error) throw error;

  // Transform to match TodaysProcedureView format
  // Note: Supabase returns single FK relations as arrays, so we access [0]
  return (data || []).map((proc) => {
    const patient = Array.isArray(proc.patient)
      ? proc.patient[0]
      : proc.patient;
    const surgeon = Array.isArray(proc.primary_surgeon)
      ? proc.primary_surgeon[0]
      : proc.primary_surgeon;

    return {
      procedure_id: proc.id,
      procedure_number: proc.procedure_number,
      procedure_name: proc.procedure_name,
      scheduled_date: proc.scheduled_date,
      scheduled_duration_minutes: proc.scheduled_duration_minutes,
      priority: proc.priority,
      status: proc.status,
      location: proc.location,
      room_number: proc.room_number,
      anesthesia_type: proc.anesthesia_type,
      patient_id: proc.patient_id,
      first_name: patient?.first_name,
      last_name: patient?.surname,
      hospital_id: patient?.emr_number,
      surgeon_first_name: surgeon?.first_name,
      surgeon_last_name: surgeon?.last_name,
      facility_id: proc.facility_id,
    };
  }) as TodaysProcedureView[];
}

/**
 * Get procedures by date range
 */
export async function getProceduresByDateRange(
  facilityId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase
    .from('procedures')
    .select(
      `
      *,
      patient:patients(id, first_name, surname, emr_number, date_of_birth, gender),
      catalogue:procedure_catalogue(id, name, code, category),
      primary_surgeon:staff!procedures_primary_surgeon_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('facility_id', facilityId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date');

  if (error) throw error;
  return data as Procedure[];
}

/**
 * Get a single procedure by ID
 */
export async function getProcedureById(procedureId: string) {
  const { data, error } = await supabase
    .from('procedures')
    .select(
      `
      *,
      patient:patients(*),
      catalogue:procedure_catalogue(*),
      admission:admissions(id, admission_number, current_ward:wards(id, name)),
      primary_surgeon:staff!procedures_primary_surgeon_id_fkey(id, first_name, last_name),
      anesthesiologist:staff!procedures_anesthesiologist_id_fkey(id, first_name, last_name),
      scrub_nurse:staff!procedures_scrub_nurse_id_fkey(id, first_name, last_name),
      circulating_nurse:staff!procedures_circulating_nurse_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('id', procedureId)
    .single();

  if (error) throw error;
  return data as Procedure;
}

/**
 * Get procedure by number
 */
export async function getProcedureByNumber(procedureNumber: string) {
  const { data, error } = await supabase
    .from('procedures')
    .select(
      `
      *,
      patient:patients(*),
      catalogue:procedure_catalogue(*)
    `,
    )
    .eq('procedure_number', procedureNumber)
    .single();

  if (error) throw error;
  return data as Procedure;
}

/**
 * Get procedures for a patient
 */
export async function getPatientProcedures(patientId: string) {
  const { data, error } = await supabase
    .from('procedures')
    .select(
      `
      *,
      catalogue:procedure_catalogue(id, name, code, category),
      primary_surgeon:staff!procedures_primary_surgeon_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('patient_id', patientId)
    .order('scheduled_date', { ascending: false });

  if (error) throw error;
  return data as Procedure[];
}

/**
 * Get procedures for an admission
 */
export async function getAdmissionProcedures(admissionId: string) {
  const { data, error } = await supabase
    .from('procedures')
    .select(
      `
      *,
      catalogue:procedure_catalogue(id, name, code, category),
      primary_surgeon:staff!procedures_primary_surgeon_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('admission_id', admissionId)
    .order('scheduled_date', { ascending: false });

  if (error) throw error;
  return data as Procedure[];
}

/**
 * Get procedures by status
 */
export async function getProceduresByStatus(
  facilityId: string,
  status: ProcedureStatus,
) {
  const { data, error } = await supabase
    .from('procedures')
    .select(
      `
      *,
      patient:patients(id, first_name, surname, emr_number),
      primary_surgeon:staff!procedures_primary_surgeon_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('facility_id', facilityId)
    .eq('status', status)
    .order('scheduled_date');

  if (error) throw error;
  return data as Procedure[];
}

/**
 * Get procedures by surgeon
 */
export async function getProceduresBySurgeon(
  surgeonId: string,
  startDate?: string,
  endDate?: string,
) {
  let query = supabase
    .from('procedures')
    .select(
      `
      *,
      patient:patients(id, first_name, surname, emr_number),
      catalogue:procedure_catalogue(id, name, category)
    `,
    )
    .eq('primary_surgeon_id', surgeonId)
    .order('scheduled_date', { ascending: false });

  if (startDate) {
    query = query.gte('scheduled_date', startDate);
  }
  if (endDate) {
    query = query.lte('scheduled_date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Procedure[];
}

/**
 * Get pending procedures (scheduled or pre-op) - upcoming procedures
 */
export async function getPendingProcedures(facilityId: string) {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('procedures')
    .select(
      `
      *,
      patient:patients(id, first_name, surname, emr_number),
      primary_surgeon:staff!procedures_primary_surgeon_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('facility_id', facilityId)
    .in('status', ['scheduled', 'pre_op'])
    .gte('scheduled_date', today)
    .order('scheduled_date');

  if (error) throw error;
  return data as Procedure[];
}

/**
 * Get completed procedures
 */
export async function getCompletedProcedures(
  facilityId: string,
  limit?: number,
) {
  let query = supabase
    .from('procedures')
    .select(
      `
      *,
      patient:patients(id, first_name, surname, emr_number),
      primary_surgeon:staff!procedures_primary_surgeon_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('facility_id', facilityId)
    .eq('status', 'completed')
    .order('actual_end_time', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Procedure[];
}

/**
 * Get all procedures for a facility (for full list view)
 */
export async function getAllProcedures(facilityId: string, limit?: number) {
  let query = supabase
    .from('procedures')
    .select(
      `
      *,
      patient:patients(id, first_name, surname, emr_number),
      primary_surgeon:staff!procedures_primary_surgeon_id_fkey(id, first_name, last_name),
      catalogue:procedure_catalogue(id, name, code, category)
    `,
    )
    .eq('facility_id', facilityId)
    .order('scheduled_date', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Procedure[];
}

/**
 * Search procedures
 */
export async function searchProcedures(facilityId: string, searchTerm: string) {
  const { data, error } = await supabase
    .from('procedures')
    .select(
      `
      *,
      patient:patients(id, first_name, surname, emr_number),
      catalogue:procedure_catalogue(id, name, code)
    `,
    )
    .eq('facility_id', facilityId)
    .or(
      `procedure_number.ilike.%${sanitizeFilterValue(searchTerm)}%,procedure_name.ilike.%${sanitizeFilterValue(searchTerm)}%`,
    )
    .order('scheduled_date', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as Procedure[];
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new procedure
 */
export async function createProcedure(
  facilityId: string,
  procedureData: CreateProcedureDTO,
  userId: string,
) {
  // Generate procedure number
  const { data: procedureNumber, error: numError } = await supabase.rpc(
    'generate_procedure_number',
    { facility_code: 'PRC' },
  );

  if (numError) throw numError;

  const { data, error } = await supabase
    .from('procedures')
    .insert({
      facility_id: facilityId || null,
      procedure_number: procedureNumber,
      patient_id: procedureData.patient_id,
      encounter_id: procedureData.encounter_id,
      admission_id: procedureData.admission_id || null,
      catalogue_id: procedureData.catalogue_id || null,
      procedure_name: procedureData.procedure_name,
      procedure_code: procedureData.procedure_code || null,
      scheduled_date: procedureData.scheduled_date,
      scheduled_duration_minutes: procedureData.scheduled_duration_minutes,
      priority: procedureData.priority,
      status: 'scheduled',
      location: procedureData.location || null,
      room_number: procedureData.room_number || null,
      indication: procedureData.indication || null,
      pre_procedure_diagnosis: procedureData.pre_procedure_diagnosis || null,
      laterality: procedureData.laterality || null,
      body_site: procedureData.body_site || null,
      anesthesia_type: procedureData.anesthesia_type || null,
      anesthesiologist_id: procedureData.anesthesiologist_id || null,
      primary_surgeon_id: procedureData.primary_surgeon_id || null,
      assistant_surgeons: procedureData.assistant_surgeons || [],
      scrub_nurse_id: procedureData.scrub_nurse_id || null,
      circulating_nurse_id: procedureData.circulating_nurse_id || null,
      pre_op_checklist: {},
      created_by: userId || null,
    })
    .select(
      `
      *,
      patient:patients(*),
      catalogue:procedure_catalogue(*)
    `,
    )
    .single();

  if (error) throw error;
  return data as Procedure;
}

/**
 * Update a procedure
 */
export async function updateProcedure(
  procedureId: string,
  updates: UpdateProcedureDTO,
  userId: string,
) {
  const { data, error } = await supabase
    .from('procedures')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', procedureId)
    .select(
      `
      *,
      patient:patients(*),
      catalogue:procedure_catalogue(*)
    `,
    )
    .single();

  if (error) throw error;
  return data as Procedure;
}

/**
 * Update procedure status
 */
export async function updateProcedureStatus(
  procedureId: string,
  status: ProcedureStatus,
  userId: string,
  additionalUpdates?: Partial<Procedure>,
) {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    updated_by: userId,
    ...additionalUpdates,
  };

  // Set timestamps based on status
  if (status === 'in_progress' && !additionalUpdates?.actual_start_time) {
    updates.actual_start_time = new Date().toISOString();
  }
  if (status === 'completed' && !additionalUpdates?.actual_end_time) {
    updates.actual_end_time = new Date().toISOString();
    // Calculate actual duration if start time exists
    const { data: proc } = await supabase
      .from('procedures')
      .select('actual_start_time')
      .eq('id', procedureId)
      .single();

    if (proc?.actual_start_time) {
      const start = new Date(proc.actual_start_time);
      const end = new Date();
      updates.actual_duration_minutes = Math.round(
        (end.getTime() - start.getTime()) / 60000,
      );
    }
  }

  const { data, error } = await supabase
    .from('procedures')
    .update(updates)
    .eq('id', procedureId)
    .select()
    .single();

  if (error) throw error;
  return data as Procedure;
}

/**
 * Update pre-op checklist
 */
export async function updatePreOpChecklist(
  procedureId: string,
  checklist: PreOpChecklist,
  userId: string,
) {
  const { data, error } = await supabase
    .from('procedures')
    .update({
      pre_op_checklist: checklist,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', procedureId)
    .select()
    .single();

  if (error) throw error;
  return data as Procedure;
}

/**
 * Record consent
 */
export async function recordProcedureConsent(
  procedureId: string,
  consentData: {
    consent_obtained: boolean;
    consent_notes?: string;
    consent_document_id?: string;
  },
  userId: string,
) {
  const { data, error } = await supabase
    .from('procedures')
    .update({
      consent_obtained: consentData.consent_obtained,
      consent_date: new Date().toISOString(),
      consent_obtained_by: userId,
      consent_notes: consentData.consent_notes,
      consent_document_id: consentData.consent_document_id,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', procedureId)
    .select()
    .single();

  if (error) throw error;
  return data as Procedure;
}

/**
 * Add procedure notes
 */
export async function addProcedureNotes(
  procedureId: string,
  notes: {
    procedure_notes?: string;
    findings?: string;
    technique_description?: string;
    complications?: string;
    estimated_blood_loss_ml?: number;
    post_op_instructions?: string;
    post_op_diagnosis?: string;
  },
  userId: string,
) {
  const { data, error } = await supabase
    .from('procedures')
    .update({
      ...notes,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', procedureId)
    .select()
    .single();

  if (error) throw error;
  return data as Procedure;
}

/**
 * Cancel a procedure
 */
export async function cancelProcedure(
  procedureId: string,
  cancellationReason: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from('procedures')
    .update({
      status: 'cancelled',
      cancellation_reason: cancellationReason,
      cancelled_by: userId,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', procedureId)
    .select()
    .single();

  if (error) throw error;
  return data as Procedure;
}

/**
 * Postpone a procedure
 */
export async function postponeProcedure(
  procedureId: string,
  newScheduledDate: string,
  reason: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from('procedures')
    .update({
      status: 'postponed',
      scheduled_date: newScheduledDate,
      notes: reason,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', procedureId)
    .select()
    .single();

  if (error) throw error;
  return data as Procedure;
}

/**
 * Get procedure statistics
 */
export async function getProcedureStatistics(
  facilityId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase
    .from('procedures')
    .select('status, priority, catalogue:procedure_catalogue(category)')
    .eq('facility_id', facilityId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate);

  if (error) throw error;

  const stats = {
    total: data.length,
    byStatus: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
  };

  data.forEach((proc) => {
    stats.byStatus[proc.status] = (stats.byStatus[proc.status] || 0) + 1;
    stats.byPriority[proc.priority] =
      (stats.byPriority[proc.priority] || 0) + 1;
    // Handle Supabase single relation response
    const catalogue = proc.catalogue as unknown as { category: string } | null;
    if (catalogue?.category) {
      stats.byCategory[catalogue.category] =
        (stats.byCategory[catalogue.category] || 0) + 1;
    }
  });

  return stats;
}

// =============================================================================
// PROCEDURE HISTORY / ALL PATIENTS WITH PROCEDURES
// =============================================================================

export interface ProcedureHistoryFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  surgeonId?: string;
  category?: string;
  searchTerm?: string;
  patientId?: string;
}

export interface ProcedureHistoryItem {
  id: string;
  procedure_number: string;
  procedure_name: string;
  procedure_code?: string;
  status: string;
  priority: string;
  scheduled_date?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  actual_duration_minutes?: number;
  scheduled_duration_minutes?: number;
  location?: string;
  room_number?: string;
  indication: string;
  pre_procedure_diagnosis?: string;
  post_procedure_diagnosis?: string;
  // Procedure notes and documentation
  procedure_notes?: string;
  findings?: string;
  technique_description?: string;
  complications?: string;
  estimated_blood_loss_ml?: number;
  post_op_instructions?: string;
  // Anesthesia
  anesthesia_type?: string;
  anesthesia_notes?: string;
  anesthesiologist_id?: string;
  anesthesiologist_name?: string;
  // Pre-operative checklist (JSONB)
  pre_op_checklist?:
    | {
        pre_op_instructions?: string;
        special_equipment?: string;
        notes?: string;
      }
    | string;
  // Scheduling notes
  scheduling_notes?: string;
  // Timestamps
  created_at: string;
  // Patient info
  patient_id: string;
  patient_name: string;
  patient_emr_number?: string;
  patient_gender?: string;
  patient_dob?: string;
  patient_phone?: string;
  // Surgeon info
  surgeon_id?: string;
  surgeon_name?: string;
  surgeon_specialty?: string;
  // Assistant surgeons
  assistant_surgeons?: { name: string; role: string; user_id?: string }[];
  // Consumables summary
  consumables_count?: number;
  consumables_total_cost?: number;
  // Catalogue info
  catalogue_category?: string;
  // Source tracking - indicates if from procedures table or clinical_requests
  source?: 'procedures' | 'clinical_request';
  clinical_request_id?: string;
}

/**
 * Get comprehensive procedure history with patient details
 * Only shows scheduled and completed procedures from the procedures table
 * Supports filtering and pagination
 */
export async function getProcedureHistory(
  facilityId: string,
  filters: ProcedureHistoryFilters = {},
  page: number = 1,
  pageSize: number = 50,
): Promise<{ data: ProcedureHistoryItem[]; total: number }> {
  const offset = (page - 1) * pageSize;

  // Query procedures table - only scheduled/completed procedures appear here
  let query = supabase
    .from('procedures')
    .select(
      `
      id,
      procedure_number,
      procedure_name,
      procedure_code,
      status,
      priority,
      scheduled_date,
      scheduled_duration_minutes,
      actual_start_time,
      actual_end_time,
      actual_duration_minutes,
      location,
      room_number,
      indication,
      pre_procedure_diagnosis,
      post_procedure_diagnosis,
      procedure_notes,
      findings,
      technique_description,
      complications,
      estimated_blood_loss_ml,
      post_op_instructions,
      anesthesia_type,
      anesthesia_notes,
      anesthesiologist_id,
      pre_op_checklist,
      notes,
      assistant_surgeons,
      created_at,
      patient_id,
      primary_surgeon_id,
      clinical_request_id,
      patient:patients!inner(id, first_name, surname, emr_number, gender, date_of_birth, contact_phone),
      primary_surgeon:staff!procedures_primary_surgeon_id_fkey(id, first_name, last_name, role, department),
      anesthesiologist:staff!procedures_anesthesiologist_id_fkey(id, first_name, last_name),
      catalogue:procedure_catalogue(id, name, code, category),
      consumables:procedure_consumables(id, item_name, quantity_used, total_cost)
    `,
      { count: 'exact' },
    )
    .eq('facility_id', facilityId);

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.patientId) {
    query = query.eq('patient_id', filters.patientId);
  }
  if (filters.dateFrom) {
    query = query.gte('scheduled_date', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('scheduled_date', filters.dateTo);
  }
  if (filters.surgeonId) {
    query = query.eq('primary_surgeon_id', filters.surgeonId);
  }
  if (filters.searchTerm) {
    const safeSearch = sanitizeFilterValue(filters.searchTerm);
    query = query.or(
      `procedure_number.ilike.%${safeSearch}%,procedure_name.ilike.%${safeSearch}%`,
    );
  }

  // Order and paginate
  query = query
    .order('scheduled_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  // Transform procedures data
  const transformed: ProcedureHistoryItem[] = (data || []).map((proc: any) => {
    const patient = Array.isArray(proc.patient)
      ? proc.patient[0]
      : proc.patient;
    const surgeon = Array.isArray(proc.primary_surgeon)
      ? proc.primary_surgeon[0]
      : proc.primary_surgeon;
    const catalogue = Array.isArray(proc.catalogue)
      ? proc.catalogue[0]
      : proc.catalogue;
    const consumables = Array.isArray(proc.consumables) ? proc.consumables : [];
    const anesthesiologist = Array.isArray(proc.anesthesiologist)
      ? proc.anesthesiologist[0]
      : proc.anesthesiologist;

    const consumablesCount = consumables.length;
    const consumablesTotalCost = consumables.reduce(
      (sum: number, c: any) => sum + (c.total_cost || 0),
      0,
    );

    let assistantSurgeons: { name: string; role: string; user_id?: string }[] =
      [];
    if (proc.assistant_surgeons && Array.isArray(proc.assistant_surgeons)) {
      assistantSurgeons = proc.assistant_surgeons.map((a: any) => ({
        name: a.name || `Staff ${a.user_id?.slice(0, 8)}`,
        role: a.role || 'Assistant',
        user_id: a.user_id,
      }));
    }

    return {
      id: proc.id,
      procedure_number: proc.procedure_number,
      procedure_name: proc.procedure_name,
      procedure_code: proc.procedure_code,
      status: proc.status,
      priority: proc.priority,
      scheduled_date: proc.scheduled_date,
      scheduled_duration_minutes: proc.scheduled_duration_minutes,
      actual_start_time: proc.actual_start_time,
      actual_end_time: proc.actual_end_time,
      actual_duration_minutes: proc.actual_duration_minutes,
      location: proc.location,
      room_number: proc.room_number,
      indication: proc.indication,
      pre_procedure_diagnosis: proc.pre_procedure_diagnosis,
      post_procedure_diagnosis: proc.post_procedure_diagnosis,
      procedure_notes: proc.procedure_notes,
      findings: proc.findings,
      technique_description: proc.technique_description,
      complications: proc.complications,
      estimated_blood_loss_ml: proc.estimated_blood_loss_ml,
      post_op_instructions: proc.post_op_instructions,
      anesthesia_type: proc.anesthesia_type,
      anesthesia_notes: proc.anesthesia_notes,
      anesthesiologist_id: proc.anesthesiologist_id,
      anesthesiologist_name: anesthesiologist
        ? `Dr. ${anesthesiologist.first_name} ${anesthesiologist.last_name}`
        : undefined,
      pre_op_checklist: proc.pre_op_checklist,
      scheduling_notes: proc.notes,
      created_at: proc.created_at,
      patient_id: proc.patient_id,
      patient_name: patient
        ? `${patient.first_name} ${patient.surname}`
        : 'Unknown',
      patient_emr_number: patient?.emr_number,
      patient_gender: patient?.gender,
      patient_dob: patient?.date_of_birth,
      patient_phone: patient?.contact_phone,
      surgeon_id: proc.primary_surgeon_id,
      surgeon_name: surgeon
        ? `Dr. ${surgeon.first_name} ${surgeon.last_name}`
        : undefined,
      surgeon_specialty: surgeon?.department || surgeon?.role,
      assistant_surgeons: assistantSurgeons,
      consumables_count: consumablesCount,
      consumables_total_cost: consumablesTotalCost,
      catalogue_category: catalogue?.category,
      source: 'procedures' as const,
      clinical_request_id: proc.clinical_request_id,
    };
  });

  // Filter by category if specified (post-query since it's a nested field)
  let filteredData = transformed;
  if (filters.category) {
    filteredData = transformed.filter(
      (p) => p.catalogue_category === filters.category,
    );
  }

  return {
    data: filteredData,
    total: count || 0,
  };
}

/**
 * Get unique patients who have had procedures
 */
export async function getPatientsWithProcedures(facilityId: string) {
  const { data, error } = await supabase
    .from('procedures')
    .select(
      `
      patient_id,
      patient:patients!inner(
        id, 
        first_name, 
        surname, 
        emr_number, 
        gender, 
        date_of_birth,
        contact_phone
      )
    `,
    )
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get unique patients
  const patientMap = new Map<string, any>();
  (data || []).forEach((proc: any) => {
    const patient = Array.isArray(proc.patient)
      ? proc.patient[0]
      : proc.patient;
    if (patient && !patientMap.has(patient.id)) {
      patientMap.set(patient.id, {
        id: patient.id,
        name: `${patient.first_name} ${patient.surname}`,
        emr_number: patient.emr_number,
        gender: patient.gender,
        date_of_birth: patient.date_of_birth,
        contact_phone: patient.contact_phone,
      });
    }
  });

  return Array.from(patientMap.values());
}

/**
 * Get procedure count by patient
 */
export async function getProcedureCountByPatient(facilityId: string) {
  try {
    const { data, error } = await supabase
      .from('procedures')
      .select(
        `
        patient_id,
        status,
        patient:patients(id, first_name, surname, emr_number)
      `,
      )
      .eq('facility_id', facilityId);

    if (error) {
      console.error('[getProcedureCountByPatient] Query error:', error);
      throw error;
    }

    console.log(
      '[getProcedureCountByPatient] Raw data:',
      data?.length,
      'records',
    );

    // Aggregate by patient
    const patientStats = new Map<
      string,
      {
        patient_id: string;
        patient_name: string;
        emr_number: string;
        total: number;
        completed: number;
        cancelled: number;
      }
    >();

    (data || []).forEach((proc: any) => {
      const patient = Array.isArray(proc.patient)
        ? proc.patient[0]
        : proc.patient;
      if (!patient || !proc.patient_id) {
        console.warn(
          '[getProcedureCountByPatient] Skipping proc without patient:',
          proc.patient_id,
        );
        return;
      }

      const existing = patientStats.get(proc.patient_id) || {
        patient_id: proc.patient_id,
        patient_name:
          `${patient.first_name || ''} ${patient.surname || ''}`.trim() ||
          'Unknown Patient',
        emr_number: patient.emr_number || 'N/A',
        total: 0,
        completed: 0,
        cancelled: 0,
      };

      existing.total++;
      if (proc.status === 'completed') existing.completed++;
      if (proc.status === 'cancelled') existing.cancelled++;

      patientStats.set(proc.patient_id, existing);
    });

    const result = Array.from(patientStats.values()).sort(
      (a, b) => b.total - a.total,
    );
    console.log(
      '[getProcedureCountByPatient] Aggregated:',
      result.length,
      'patients',
    );
    return result;
  } catch (err) {
    console.error('[getProcedureCountByPatient] Error:', err);
    throw err;
  }
}
