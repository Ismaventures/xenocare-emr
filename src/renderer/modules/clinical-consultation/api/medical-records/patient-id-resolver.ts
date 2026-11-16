/**
 * =============================================================================
 * XENOCARE EMR - PATIENT ID RESOLVER
 * Centralized patient identifier resolution with fallback strategies
 * =============================================================================
 */

import { supabase } from '../../../../api/supabaseClient';
import { isValidUuid, log } from './constants';
import type { ResolvedPatientIds } from './types';

// =============================================================================
// Patient ID Resolution
// =============================================================================

/**
 * Resolve any patient identifier to the internal UUID (patients.id).
 * The identifier could be:
 * - patients.id (UUID primary key)
 * - patients.patient_id (VARCHAR, may also be UUID format)
 * - patients.emr_number (e.g., NDC-0001)
 *
 * Returns the patients.id UUID which is used by visits, vitals, etc.
 */
export async function resolvePatientUuid(
  identifier: string,
): Promise<ResolvedPatientIds | null> {
  if (!identifier) return null;

  log('log', 'Resolving patient identifier:', identifier);

  // Strategy 1: Try by patient_id (most common case from MyPatientsPanel)
  const { data: byPatientId, error: patientIdError } = await supabase
    .from('patients')
    .select('id, patient_id, emr_number')
    .eq('patient_id', identifier)
    .maybeSingle();

  if (patientIdError) {
    log('error', 'Error querying by patient_id:', patientIdError);
  }

  if (byPatientId) {
    log('log', 'Found patient by patient_id:', byPatientId);
    return {
      uuid: byPatientId.id,
      externalId: byPatientId.patient_id,
      emrNumber: byPatientId.emr_number || byPatientId.patient_id,
    };
  }

  // Strategy 2: Try by id (UUID primary key)
  if (isValidUuid(identifier)) {
    const { data: byId, error: idError } = await supabase
      .from('patients')
      .select('id, patient_id, emr_number')
      .eq('id', identifier)
      .maybeSingle();

    if (idError) {
      log('error', 'Error querying by UUID:', idError);
    }

    if (byId) {
      log('log', 'Found patient by UUID id:', byId);
      return {
        uuid: byId.id,
        externalId: byId.patient_id,
        emrNumber: byId.emr_number || byId.patient_id,
      };
    }
  }

  // Strategy 3: Try by emr_number
  const { data: byEmr, error: emrError } = await supabase
    .from('patients')
    .select('id, patient_id, emr_number')
    .eq('emr_number', identifier)
    .maybeSingle();

  if (emrError) {
    log('error', 'Error querying by emr_number:', emrError);
  }

  if (byEmr) {
    log('log', 'Found patient by emr_number:', byEmr);
    return {
      uuid: byEmr.id,
      externalId: byEmr.patient_id,
      emrNumber: byEmr.emr_number || byEmr.patient_id,
    };
  }

  log('warn', 'No patient found for identifier:', identifier);
  return null;
}

// =============================================================================
// Encounter ID Discovery (Fallback Strategy)
// =============================================================================

/**
 * Discover encounter IDs for a patient via related records
 * Used when direct patient_id lookup on visits fails
 */
export async function discoverEncounterIdsFromRelatedRecords(
  patientExternalId: string,
): Promise<string[]> {
  log(
    'log',
    'Discovering encounter_ids via related records for:',
    patientExternalId,
  );

  const encounterIds = new Set<string>();

  // Try via lab_requests
  const { data: labReqs } = await supabase
    .from('lab_requests')
    .select('encounter_id')
    .eq('patient_id', patientExternalId)
    .not('encounter_id', 'is', null);

  if (labReqs) {
    for (const lr of labReqs) {
      if (lr.encounter_id) encounterIds.add(lr.encounter_id);
    }
    log('log', 'Found encounter_ids via lab_requests:', labReqs.length);
  }

  // Try via radiology_requests
  const { data: radReqs } = await supabase
    .from('radiology_requests')
    .select('encounter_id')
    .eq('patient_id', patientExternalId)
    .not('encounter_id', 'is', null);

  if (radReqs) {
    for (const rr of radReqs) {
      if (rr.encounter_id) encounterIds.add(rr.encounter_id);
    }
    log('log', 'Found encounter_ids via radiology_requests:', radReqs.length);
  }

  return Array.from(encounterIds);
}

/**
 * Get patient details by UUID
 */
export async function getPatientByUuid(
  patientUuid: string,
): Promise<Record<string, unknown> | null> {
  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientUuid)
    .maybeSingle();

  if (error) {
    log('error', 'Error fetching patient by UUID:', error);
    return null;
  }

  return patient;
}

/**
 * Get principal patient name for dependents
 */
export async function getPrincipalPatientName(
  principalId: string,
): Promise<string | undefined> {
  const { data: principalPatient } = await supabase
    .from('patients')
    .select('first_name, surname, rank')
    .eq('id', principalId)
    .maybeSingle();

  if (principalPatient) {
    const { rank, first_name, surname } = principalPatient;
    return `${rank ? `${rank} ` : ''}${first_name} ${surname}`.trim();
  }

  return undefined;
}
