/**
 * =============================================================================
 * Patient ID Resolver
 *
 * Many Supabase tables (lab_requests, prescriptions, procedure_requests, etc.)
 * have a `patient_id` column that references `patients.patient_id` (VARCHAR,
 * e.g. "PT-00001"). But encounter/visit data often carries `patients.id`
 * (UUID). Passing a UUID where a VARCHAR FK is expected causes a 23503 FK
 * constraint violation.
 *
 * This module provides a single resolver that accepts EITHER form and always
 * returns the VARCHAR business key.
 * =============================================================================
 */

import { supabase } from '../api/supabaseClient';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolve a patient identifier to the VARCHAR business key (patients.patient_id).
 *
 * - If the input is a UUID (patients.id), looks up the matching patient_id.
 * - If the input is already a VARCHAR key, verifies it exists and returns it.
 *
 * Throws if the patient cannot be found.
 */
export async function resolvePatientVarcharId(
  identifier: string,
): Promise<string> {
  if (!identifier) {
    throw new Error('Patient identifier is required');
  }

  // If it looks like a UUID, it's likely patients.id — resolve to patient_id
  if (UUID_REGEX.test(identifier)) {
    const { data } = await supabase
      .from('patients')
      .select('patient_id')
      .eq('id', identifier)
      .maybeSingle();

    if (data?.patient_id) {
      return data.patient_id;
    }
    // UUID didn't match patients.id — fall through to patient_id check
  }

  // Verify it exists as a VARCHAR patient_id
  const { data } = await supabase
    .from('patients')
    .select('patient_id')
    .eq('patient_id', identifier)
    .maybeSingle();

  if (data?.patient_id) {
    return data.patient_id;
  }

  throw new Error(`Patient not found: ${identifier}`);
}
