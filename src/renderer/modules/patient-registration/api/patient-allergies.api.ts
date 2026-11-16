import { supabase } from '../../../api/supabaseClient';

export type AllergySeverity =
  | 'Mild'
  | 'Moderate'
  | 'Severe'
  | 'Life-threatening';

export interface PatientAllergyDTO {
  id: string;
  patient_id: string;
  allergen: string;
  reaction: string | null;
  severity: AllergySeverity;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientAllergyInput {
  allergen: string;
  reaction?: string;
  severity: AllergySeverity;
  notes?: string;
}

export interface PatientAllergyReview {
  no_known_allergies: boolean;
  allergies_reviewed_at: string | null;
}

export const ALLERGY_SEVERITIES: AllergySeverity[] = [
  'Mild',
  'Moderate',
  'Severe',
  'Life-threatening',
];

export async function getPatientAllergies(
  patientId: string,
): Promise<PatientAllergyDTO[]> {
  const { data, error } = await supabase
    .from('patient_allergies')
    .select(
      'id, patient_id, allergen, reaction, severity, notes, is_active, created_at, updated_at',
    )
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .order('severity', { ascending: false })
    .order('allergen');

  if (error) throw error;
  return (data || []) as PatientAllergyDTO[];
}

export async function getPatientAllergyReview(
  patientId: string,
): Promise<PatientAllergyReview | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('no_known_allergies, allergies_reviewed_at')
    .eq('id', patientId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    no_known_allergies: Boolean(data.no_known_allergies),
    allergies_reviewed_at: data.allergies_reviewed_at ?? null,
  };
}

function normalizeEntries(entries: PatientAllergyInput[]) {
  const seen = new Set<string>();
  const normalized: PatientAllergyInput[] = [];

  for (const entry of entries) {
    const allergen = entry.allergen?.trim();
    if (!allergen) continue;
    const key = allergen.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      allergen,
      reaction: entry.reaction?.trim() || undefined,
      severity: entry.severity || 'Moderate',
      notes: entry.notes?.trim() || undefined,
    });
  }

  return normalized;
}

export async function savePatientAllergies(params: {
  patientId: string;
  noKnownAllergies: boolean;
  entries: PatientAllergyInput[];
  recordedBy?: string | null;
}): Promise<void> {
  const { patientId, noKnownAllergies, recordedBy } = params;
  const entries = noKnownAllergies
    ? []
    : normalizeEntries(params.entries);

  const { error: patientError } = await supabase
    .from('patients')
    .update({
      no_known_allergies: noKnownAllergies,
      allergies_reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', patientId);

  if (patientError) throw patientError;

  const { data: existing, error: existingError } = await supabase
    .from('patient_allergies')
    .select('id, allergen, is_active')
    .eq('patient_id', patientId);

  if (existingError) throw existingError;

  const existingByAllergen = new Map(
    (existing || [])
      .filter((row) => row.is_active)
      .map((row) => [String(row.allergen).trim().toLowerCase(), row]),
  );
  const keptKeys = new Set<string>();

  for (const entry of entries) {
    const key = entry.allergen.toLowerCase();
    keptKeys.add(key);
    const current = existingByAllergen.get(key);

    if (current) {
      const { error } = await supabase
        .from('patient_allergies')
        .update({
          allergen: entry.allergen,
          reaction: entry.reaction ?? null,
          severity: entry.severity,
          notes: entry.notes ?? null,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', current.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('patient_allergies').insert({
        patient_id: patientId,
        allergen: entry.allergen,
        reaction: entry.reaction ?? null,
        severity: entry.severity,
        notes: entry.notes ?? null,
        is_active: true,
        recorded_by: recordedBy || null,
      });
      if (error) throw error;
    }
  }

  const deactivateIds = (existing || [])
    .filter(
      (row) =>
        row.is_active &&
        !keptKeys.has(String(row.allergen).trim().toLowerCase()),
    )
    .map((row) => row.id);

  if (deactivateIds.length > 0) {
    const { error } = await supabase
      .from('patient_allergies')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('id', deactivateIds);
    if (error) throw error;
  }
}
