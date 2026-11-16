/**
 * =============================================================================
 * Clinician Saved Notes — Types & API
 *
 * Personal per-clinician library of reusable clinical text snippets.
 * Each user can only access their own saved notes (enforced by RLS).
 * =============================================================================
 */

import { supabase } from '../api/supabaseClient';

// ── Types ────────────────────────────────────────────────────────────────────

export type SavedNoteCategory =
  | 'radiology_findings'
  | 'radiology_impression'
  | 'radiology_notes'
  | 'consultation_subjective'
  | 'consultation_objective'
  | 'consultation_assessment'
  | 'consultation_plan'
  | 'consultation_notes'
  | 'dental_notes'
  | 'specialty_notes'
  | 'procedure_notes'
  | 'discharge_notes'
  | 'admission_notes'
  | 'surgery_notes'
  | 'anc_notes'
  | 'ae_notes'
  | 'nursing_notes'
  | 'psychiatry_notes'
  | 'referral_notes'
  | 'general';

export interface ClinicianSavedNote {
  id: string;
  user_id: string;
  staff_id: string | null;
  category: SavedNoteCategory;
  subcategory: string | null;
  title: string;
  content: string;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSavedNoteInput {
  category: SavedNoteCategory;
  subcategory?: string;
  title: string;
  content: string;
}

// ── API functions ────────────────────────────────────────────────────────────

/** Search saved notes for the current user using full-text + ILIKE fallback */
export async function searchSavedNotes(
  query: string,
  category?: SavedNoteCategory,
  limit = 20,
): Promise<ClinicianSavedNote[]> {
  const { data, error } = await supabase.rpc('search_clinician_saved_notes', {
    p_query: query || '',
    p_category: category || null,
    p_limit: limit,
  });

  if (error) throw error;
  return (data as ClinicianSavedNote[]) || [];
}

/** Fetch recent notes for a category (no search term — MRU order) */
export async function fetchRecentNotes(
  category?: SavedNoteCategory | null,
  limit = 10,
): Promise<ClinicianSavedNote[]> {
  let q = supabase
    .from('clinician_saved_notes')
    .select('*');

  if (category) {
    q = q.eq('category', category);
  }

  const { data, error } = await q
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .order('use_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as ClinicianSavedNote[]) || [];
}

/** Create a new saved note */
export async function createSavedNote(
  input: CreateSavedNoteInput,
): Promise<ClinicianSavedNote> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('clinician_saved_notes')
    .insert({
      user_id: user.id,
      category: input.category,
      subcategory: input.subcategory || null,
      title: input.title,
      content: input.content,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ClinicianSavedNote;
}

/** Increment use_count and update last_used_at when a note is reused */
export async function recordNoteUsage(noteId: string): Promise<void> {
  // Fetch current use_count, then increment
  const { data } = await supabase
    .from('clinician_saved_notes')
    .select('use_count')
    .eq('id', noteId)
    .single();

  const currentCount = (data as { use_count: number } | null)?.use_count ?? 0;

  await supabase
    .from('clinician_saved_notes')
    .update({
      use_count: currentCount + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', noteId);
}

/** Delete a saved note */
export async function deleteSavedNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('clinician_saved_notes')
    .delete()
    .eq('id', noteId);

  if (error) throw error;
}

/** Update a saved note's content */
export async function updateSavedNote(
  noteId: string,
  updates: { title?: string; content?: string },
): Promise<void> {
  const { error } = await supabase
    .from('clinician_saved_notes')
    .update(updates)
    .eq('id', noteId);

  if (error) throw error;
}

/**
 * Auto-save content as a note, deduplicating by title within the category.
 * If a note with the same title already exists, update its content instead.
 */
export async function upsertSavedNote(
  input: CreateSavedNoteInput,
): Promise<ClinicianSavedNote> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('clinician_saved_notes')
    .upsert(
      {
        user_id: user.id,
        category: input.category,
        subcategory: input.subcategory || null,
        title: input.title,
        content: input.content,
      },
      { onConflict: 'user_id,category,title', ignoreDuplicates: false },
    )
    .select()
    .single();

  // If upsert fails due to missing unique constraint, fall back to insert
  if (error) {
    return createSavedNote(input);
  }
  return data as ClinicianSavedNote;
}

/** Generate a short title from content (first line or first 80 chars) */
export function generateNoteTitle(content: string): string {
  const trimmed = content.trim();
  const firstLine = trimmed.split('\n')[0].trim();
  if (firstLine.length <= 80) return firstLine;
  return firstLine.slice(0, 77) + '…';
}
