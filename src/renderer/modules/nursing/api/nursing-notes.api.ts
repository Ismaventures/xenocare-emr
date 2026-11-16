/**
 * Nursing Notes API
 *
 * CRUD operations for nursing observations, progress notes,
 * and other reports that nurses add to patient encounters.
 */

import { supabase } from '../../../api/supabaseClient';
import {
  NursingNoteDTO,
  CreateNursingNoteDTO,
  UpdateNursingNoteDTO,
  NursingNoteFilters,
  NursingNotesResponse,
} from '../dtos/nursing-notes.dto';
import { createScopedLogger } from '../../../utils/logger';

const log = createScopedLogger('NursingNotesAPI');

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get current user's staff ID
 */
async function getCurrentStaffId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: staffData, error } = await supabase
    .from('staff')
    .select('staff_id, id')
    .eq('email', user.email)
    .single();

  if (error || !staffData) throw new Error('Staff record not found');

  // Return UUID (id) for foreign key references
  return staffData.id || staffData.staff_id;
}

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Get nursing notes with filters
 */
export async function getNursingNotes(
  filters: NursingNoteFilters = {},
): Promise<NursingNotesResponse> {
  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  let query = supabase
    .from('nursing_notes')
    .select(
      `
      *,
      patient:patients!nursing_notes_patient_id_fkey(patient_id, first_name, surname, emr_number, date_of_birth, gender),
      recorder:staff!nursing_notes_recorded_by_fkey(staff_id, first_name, last_name),
      encounter:visits!nursing_notes_encounter_id_fkey(visit_id, encounter_number, visit_type, current_stage),
      treatment_plan:treatment_plans(plan_id:id, title, status)
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.encounter_id) {
    query = query.eq('encounter_id', filters.encounter_id);
  }

  if (filters.patient_id) {
    query = query.eq('patient_id', filters.patient_id);
  }

  if (filters.treatment_plan_id) {
    query = query.eq('treatment_plan_id', filters.treatment_plan_id);
  }

  if (filters.recorded_by) {
    query = query.eq('recorded_by', filters.recorded_by);
  }

  if (filters.note_type) {
    query = query.eq('note_type', filters.note_type);
  }

  if (filters.patient_condition) {
    query = query.eq('patient_condition', filters.patient_condition);
  }

  if (filters.shift) {
    query = query.eq('shift', filters.shift);
  }

  if (filters.is_critical !== undefined) {
    query = query.eq('is_critical', filters.is_critical);
  }

  if (filters.requires_doctor_review !== undefined) {
    query = query.eq('requires_doctor_review', filters.requires_doctor_review);
  }

  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`,
    );
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    log.error('Error fetching nursing notes:', error);
    throw error;
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);
  const page = Math.floor(offset / limit) + 1;

  return {
    data: (data || []) as NursingNoteDTO[],
    total,
    page,
    totalPages,
  };
}

/**
 * Get a single nursing note by ID
 */
export async function getNursingNoteById(
  id: string,
): Promise<NursingNoteDTO | null> {
  const { data, error } = await supabase
    .from('nursing_notes')
    .select(
      `
      *,
      patient:patients!nursing_notes_patient_id_fkey(patient_id, first_name, surname, emr_number, date_of_birth, gender),
      recorder:staff!nursing_notes_recorded_by_fkey(staff_id, first_name, last_name),
      encounter:visits!nursing_notes_encounter_id_fkey(visit_id, encounter_number, visit_type, current_stage),
      treatment_plan:treatment_plans(plan_id:id, title, status)
    `,
    )
    .eq('id', id)
    .single();

  if (error) {
    log.error('Error fetching nursing note:', error);
    throw error;
  }

  return data as NursingNoteDTO | null;
}

/**
 * Get nursing notes for a specific encounter
 */
export async function getNursingNotesByEncounter(
  encounterId: string,
): Promise<NursingNoteDTO[]> {
  const { data, error } = await supabase
    .from('nursing_notes')
    .select(
      `
      *,
      patient:patients!nursing_notes_patient_id_fkey(patient_id, first_name, surname, emr_number),
      recorder:staff!nursing_notes_recorded_by_fkey(staff_id, first_name, last_name),
      treatment_plan:treatment_plans(plan_id:id, title, status)
    `,
    )
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Error fetching nursing notes by encounter:', error);
    throw error;
  }

  return (data || []) as NursingNoteDTO[];
}

/**
 * Get nursing notes for a specific patient
 */
export async function getNursingNotesByPatient(
  patientId: string,
  limit: number = 20,
): Promise<NursingNoteDTO[]> {
  const { data, error } = await supabase
    .from('nursing_notes')
    .select(
      `
      *,
      recorder:staff!nursing_notes_recorded_by_fkey(staff_id, first_name, last_name),
      encounter:visits!nursing_notes_encounter_id_fkey(visit_id, encounter_number, visit_type)
    `,
    )
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    log.error('Error fetching nursing notes by patient:', error);
    throw error;
  }

  return (data || []) as NursingNoteDTO[];
}

/**
 * Get nursing notes linked to a treatment plan
 */
export async function getNursingNotesByTreatmentPlan(
  treatmentPlanId: string,
): Promise<NursingNoteDTO[]> {
  const { data, error } = await supabase
    .from('nursing_notes')
    .select(
      `
      *,
      patient:patients!nursing_notes_patient_id_fkey(patient_id, first_name, surname),
      recorder:staff!nursing_notes_recorded_by_fkey(staff_id, first_name, last_name)
    `,
    )
    .eq('treatment_plan_id', treatmentPlanId)
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Error fetching nursing notes by treatment plan:', error);
    throw error;
  }

  return (data || []) as NursingNoteDTO[];
}

/**
 * Get critical nursing notes requiring attention
 */
export async function getCriticalNursingNotes(): Promise<NursingNoteDTO[]> {
  const { data, error } = await supabase
    .from('nursing_notes')
    .select(
      `
      *,
      patient:patients!nursing_notes_patient_id_fkey(patient_id, first_name, surname, emr_number),
      recorder:staff!nursing_notes_recorded_by_fkey(staff_id, first_name, last_name),
      encounter:visits!nursing_notes_encounter_id_fkey(visit_id, encounter_number)
    `,
    )
    .eq('is_critical', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    log.error('Error fetching critical nursing notes:', error);
    throw error;
  }

  return (data || []) as NursingNoteDTO[];
}

/**
 * Get notes requiring doctor review
 */
export async function getNotesRequiringDoctorReview(): Promise<
  NursingNoteDTO[]
> {
  const { data, error } = await supabase
    .from('nursing_notes')
    .select(
      `
      *,
      patient:patients!nursing_notes_patient_id_fkey(patient_id, first_name, surname, emr_number),
      recorder:staff!nursing_notes_recorded_by_fkey(staff_id, first_name, last_name),
      encounter:visits!nursing_notes_encounter_id_fkey(visit_id, encounter_number)
    `,
    )
    .eq('requires_doctor_review', true)
    .is('doctor_reviewed_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Error fetching notes requiring review:', error);
    throw error;
  }

  return (data || []) as NursingNoteDTO[];
}

/**
 * Create a new nursing note
 */
export async function createNursingNote(
  data: CreateNursingNoteDTO,
): Promise<NursingNoteDTO> {
  const staffId = await getCurrentStaffId();

  // Strip any transient/client-only fields before inserting
  const { _prescription, ...cleanData } = data as any;

  const insertData = {
    ...cleanData,
    recorded_by: staffId,
    follow_up_required: data.follow_up_required ?? false,
    is_critical: data.is_critical ?? false,
    requires_doctor_review: data.requires_doctor_review ?? false,
  };

  const { data: note, error } = await supabase
    .from('nursing_notes')
    .insert(insertData)
    .select(
      `
      *,
      patient:patients!nursing_notes_patient_id_fkey(patient_id, first_name, surname, emr_number),
      recorder:staff!nursing_notes_recorded_by_fkey(staff_id, first_name, last_name)
    `,
    )
    .single();

  if (error) {
    log.error('Error creating nursing note:', error);
    throw error;
  }

  return note as NursingNoteDTO;
}

/**
 * Update a nursing note
 */
export async function updateNursingNote(
  data: UpdateNursingNoteDTO,
): Promise<NursingNoteDTO> {
  const { id, ...updateData } = data;

  const { data: note, error } = await supabase
    .from('nursing_notes')
    .update(updateData)
    .eq('id', id)
    .select(
      `
      *,
      patient:patients!nursing_notes_patient_id_fkey(patient_id, first_name, surname, emr_number),
      recorder:staff!nursing_notes_recorded_by_fkey(staff_id, first_name, last_name)
    `,
    )
    .single();

  if (error) {
    log.error('Error updating nursing note:', error);
    throw error;
  }

  return note as NursingNoteDTO;
}

/**
 * Delete a nursing note
 */
export async function deleteNursingNote(id: string): Promise<void> {
  const { error } = await supabase.from('nursing_notes').delete().eq('id', id);

  if (error) {
    log.error('Error deleting nursing note:', error);
    throw error;
  }
}

/**
 * Mark a note as reviewed by doctor
 */
export async function markNoteAsReviewed(id: string): Promise<NursingNoteDTO> {
  const staffId = await getCurrentStaffId();

  const { data: note, error } = await supabase
    .from('nursing_notes')
    .update({
      doctor_reviewed_by: staffId,
      doctor_reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    log.error('Error marking note as reviewed:', error);
    throw error;
  }

  return note as NursingNoteDTO;
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get nursing notes statistics
 */
export async function getNursingNotesStats(): Promise<{
  total_notes: number;
  notes_today: number;
  critical_notes: number;
  pending_review: number;
  notes_by_type: Record<string, number>;
}> {
  // Build date range for today in local timezone
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today = startOfDay.toISOString();

  // Get total notes
  const { count: totalNotes } = await supabase
    .from('nursing_notes')
    .select('*', { count: 'exact', head: true });

  // Get notes created today
  const { count: notesToday } = await supabase
    .from('nursing_notes')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);

  // Get critical notes
  const { count: criticalNotes } = await supabase
    .from('nursing_notes')
    .select('*', { count: 'exact', head: true })
    .eq('is_critical', true);

  // Get notes pending doctor review
  const { count: pendingReview } = await supabase
    .from('nursing_notes')
    .select('*', { count: 'exact', head: true })
    .eq('requires_doctor_review', true)
    .is('doctor_reviewed_at', null);

  // Get notes by type (simplified)
  const { data: notesByType } = await supabase
    .from('nursing_notes')
    .select('note_type')
    .gte('created_at', today);

  const typeCount: Record<string, number> = {};
  (notesByType || []).forEach((note) => {
    typeCount[note.note_type] = (typeCount[note.note_type] || 0) + 1;
  });

  return {
    total_notes: totalNotes || 0,
    notes_today: notesToday || 0,
    critical_notes: criticalNotes || 0,
    pending_review: pendingReview || 0,
    notes_by_type: typeCount,
  };
}