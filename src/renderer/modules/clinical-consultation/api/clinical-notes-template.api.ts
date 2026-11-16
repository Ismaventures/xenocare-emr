/**
 * =============================================================================
 * CLINICAL NOTE TEMPLATES API
 * =============================================================================
 * Supabase queries for the clinical_note_templates and clinical_notes tables.
 * Provides template fetching, resolution, and note CRUD.
 * =============================================================================
 */

import { supabase } from '../../../api/supabaseClient';
import type {
  ClinicalNoteTemplate,
  ClinicalNoteType,
  NoteTemplateContext,
  ClinicalNoteRecord,
} from '../dtos/clinical-note-template.types';

// =============================================================================
// Template Queries
// =============================================================================

/**
 * Fetch all active templates for a given note type.
 */
export async function fetchActiveTemplates(
  noteType: ClinicalNoteType,
): Promise<ClinicalNoteTemplate[]> {
  const { data, error } = await supabase
    .from('clinical_note_templates')
    .select('*')
    .eq('note_type', noteType)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) {
    console.error('[NoteTemplates] Error fetching templates:', error);
    return [];
  }
  return (data || []) as ClinicalNoteTemplate[];
}

/**
 * Fetch all active templates (all note types).
 */
export async function fetchAllActiveTemplates(): Promise<
  ClinicalNoteTemplate[]
> {
  const { data, error } = await supabase
    .from('clinical_note_templates')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) {
    console.error('[NoteTemplates] Error fetching all templates:', error);
    return [];
  }
  return (data || []) as ClinicalNoteTemplate[];
}

/**
 * Resolve the best matching template using the database RPC function.
 * Falls back to client-side resolution if RPC fails.
 */
export async function resolveNoteTemplateRPC(
  ctx: NoteTemplateContext,
): Promise<ClinicalNoteTemplate | null> {
  const { data, error } = await supabase.rpc('resolve_note_template', {
    p_note_type: ctx.note_type,
    p_specialty_code: ctx.specialty_code || null,
    p_clinic_id: ctx.clinic_id || null,
    p_role: ctx.user_role || null,
    p_encounter_type: ctx.encounter_type || null,
    p_patient_context: ctx.patient_context || null,
  });

  if (error) {
    console.warn(
      '[NoteTemplates] RPC resolve_note_template failed, using client-side fallback:',
      error,
    );
    return null;
  }
  return data as ClinicalNoteTemplate | null;
}

// =============================================================================
// Client-Side Template Resolution (fallback / primary)
// =============================================================================

/**
 * Client-side template resolution engine.
 * Scores each template based on how many context fields match,
 * then returns the highest-scoring active template.
 *
 * Scoring:
 *   - Template column IS NULL → neutral (0 points, no penalty)
 *   - Template column matches context → +points based on specificity
 *   - Template column is set but DOESN'T match → disqualified (-Infinity)
 *
 * Point values:
 *   specialty_code match  = 10
 *   clinic_id match       = 8
 *   role match            = 6
 *   encounter_type match  = 4
 *   patient_context match = 4
 *   + template.priority as tiebreaker
 */
export function resolveTemplateClientSide(
  templates: ClinicalNoteTemplate[],
  ctx: NoteTemplateContext,
): ClinicalNoteTemplate | null {
  const candidates = templates.filter(
    (t) => t.note_type === ctx.note_type && t.is_active,
  );

  let bestScore = -1;
  let bestTemplate: ClinicalNoteTemplate | null = null;

  for (const tpl of candidates) {
    let score = tpl.priority;

    // Specialty code
    if (tpl.specialty_code) {
      if (ctx.specialty_code && tpl.specialty_code === ctx.specialty_code) {
        score += 10;
      } else {
        continue; // disqualified
      }
    }

    // Clinic ID
    if (tpl.specialty_clinic_id) {
      if (ctx.clinic_id && tpl.specialty_clinic_id === ctx.clinic_id) {
        score += 8;
      } else {
        continue;
      }
    }

    // Role
    if (tpl.role) {
      if (ctx.user_role && tpl.role === ctx.user_role) {
        score += 6;
      } else {
        continue;
      }
    }

    // Encounter type
    if (tpl.encounter_type) {
      if (ctx.encounter_type && tpl.encounter_type === ctx.encounter_type) {
        score += 4;
      } else {
        continue;
      }
    }

    // Patient context
    if (tpl.patient_context) {
      if (ctx.patient_context && tpl.patient_context === ctx.patient_context) {
        score += 4;
      } else {
        continue;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestTemplate = tpl;
    }
  }

  return bestTemplate;
}

// =============================================================================
// Encounter Clinic Context
// =============================================================================

interface EncounterClinicInfo {
  clinic_id: string | null;
  clinic_name: string | null;
  specialty_code: string | null;
  visit_type: string | null;
}

/**
 * Fetch clinic information for an encounter (visit).
 * Used to determine which specialty templates to show.
 */
export async function fetchEncounterClinicInfo(
  encounterId: string,
): Promise<EncounterClinicInfo> {
  const { data, error } = await supabase
    .from('visits')
    .select(
      `
      clinic_id,
      visit_type,
      clinic:clinics!visits_clinic_id_fkey(id, clinic_name, clinic_code)
    `,
    )
    .eq('id', encounterId)
    .maybeSingle();

  if (error || !data) {
    console.warn(
      '[NoteTemplates] Could not fetch encounter clinic info:',
      error,
    );
    return {
      clinic_id: null,
      clinic_name: null,
      specialty_code: null,
      visit_type: null,
    };
  }

  const clinic = Array.isArray(data.clinic) ? data.clinic[0] : data.clinic;
  return {
    clinic_id: data.clinic_id || null,
    clinic_name: clinic?.clinic_name || null,
    specialty_code: clinic?.clinic_code || null,
    visit_type: data.visit_type || null,
  };
}

// =============================================================================
// Clinical Note CRUD (new clinical_notes table)
// =============================================================================

export interface CreateClinicalNoteDTO {
  patient_id: string;
  encounter_id: string;
  note_type: ClinicalNoteType;
  template_key?: string | null;
  specialty_clinic_id?: string | null;
  department_id?: string | null;
  author_id: string;
  author_role: string;

  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  notes?: string | null;
  follow_up_date?: string | null;
  follow_up_notes?: string | null;

  specialty_data?: Record<string, unknown>;
  display_label?: string | null;
  status?: 'draft' | 'final';
}

/**
 * Insert a new clinical note into the clinical_notes table.
 */
export async function createClinicalNote(
  dto: CreateClinicalNoteDTO,
): Promise<ClinicalNoteRecord | null> {
  const { data, error } = await supabase
    .from('clinical_notes')
    .insert({
      patient_id: dto.patient_id,
      encounter_id: dto.encounter_id,
      note_type: dto.note_type,
      template_key: dto.template_key || null,
      specialty_clinic_id: dto.specialty_clinic_id || null,
      department_id: dto.department_id || null,
      author_id: dto.author_id,
      author_role: dto.author_role,
      subjective: dto.subjective || null,
      objective: dto.objective || null,
      assessment: dto.assessment || null,
      plan: dto.plan || null,
      notes: dto.notes || null,
      follow_up_date: dto.follow_up_date || null,
      follow_up_notes: dto.follow_up_notes || null,
      specialty_data: dto.specialty_data || {},
      display_label: dto.display_label || null,
      status: dto.status || 'final',
    })
    .select()
    .single();

  if (error) {
    console.error('[ClinicalNotes] Error creating note:', error);
    throw error;
  }

  return data as ClinicalNoteRecord;
}

/**
 * Fetch all clinical notes for an encounter, ordered chronologically.
 */
export async function fetchClinicalNotesByEncounter(
  encounterId: string,
): Promise<ClinicalNoteRecord[]> {
  const { data, error } = await supabase
    .from('clinical_notes')
    .select('*')
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ClinicalNotes] Error fetching notes:', error);
    return [];
  }

  return (data || []) as ClinicalNoteRecord[];
}
