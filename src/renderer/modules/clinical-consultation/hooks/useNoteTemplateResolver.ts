/**
 * =============================================================================
 * useNoteTemplateResolver — React hook for clinical note template resolution
 * =============================================================================
 * Given an encounter context, resolves the best matching note template
 * for each universal note type. Uses React Query for caching.
 * =============================================================================
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type {
  ClinicalNoteTemplate,
  ClinicalNoteType,
  NoteTemplateContext,
} from '../dtos/clinical-note-template.types';
import {
  fetchAllActiveTemplates,
  fetchEncounterClinicInfo,
  resolveTemplateClientSide,
} from '../api/clinical-notes-template.api';

// =============================================================================
// Hook: Fetch encounter clinic context
// =============================================================================

export function useEncounterClinicInfo(encounterId: string | null) {
  return useQuery({
    queryKey: ['encounter-clinic-info', encounterId],
    queryFn: () => fetchEncounterClinicInfo(encounterId!),
    enabled: !!encounterId,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

// =============================================================================
// Hook: Fetch all active templates (cached globally)
// =============================================================================

export function useActiveTemplates() {
  return useQuery({
    queryKey: ['clinical-note-templates', 'active'],
    queryFn: fetchAllActiveTemplates,
    staleTime: 10 * 60 * 1000, // 10 min cache — templates rarely change
  });
}

// =============================================================================
// Hook: Resolve template for a specific note type + context
// =============================================================================

interface UseNoteTemplateResolverOptions {
  encounterId: string | null;
  userRole?: string | null;
  patientContext?: string | null;
}

interface ResolvedTemplates {
  /** Map of note_type → resolved template */
  templates: Record<ClinicalNoteType, ClinicalNoteTemplate | null>;
  /** Whether data is still loading */
  isLoading: boolean;
  /** Get template for a specific note type */
  getTemplate: (noteType: ClinicalNoteType) => ClinicalNoteTemplate | null;
  /** Encounter clinic context */
  clinicInfo: {
    clinic_id: string | null;
    clinic_name: string | null;
    specialty_code: string | null;
    visit_type: string | null;
  } | null;
}

const NOTE_TYPES: ClinicalNoteType[] = [
  'progress_note',
  'result_review',
  'clinical_update',
  'follow_up_note',
  'addendum',
];

export function useNoteTemplateResolver(
  options: UseNoteTemplateResolverOptions,
): ResolvedTemplates {
  const { encounterId, userRole, patientContext } = options;

  // Fetch encounter clinic info
  const { data: clinicInfo, isLoading: clinicLoading } =
    useEncounterClinicInfo(encounterId);

  // Fetch all active templates
  const { data: allTemplates, isLoading: templatesLoading } =
    useActiveTemplates();

  // Resolve templates for each note type
  const resolved = useMemo(() => {
    const result: Record<ClinicalNoteType, ClinicalNoteTemplate | null> = {
      progress_note: null,
      result_review: null,
      clinical_update: null,
      follow_up_note: null,
      addendum: null,
    };

    if (!allTemplates || !clinicInfo) return result;

    for (const noteType of NOTE_TYPES) {
      const ctx: NoteTemplateContext = {
        note_type: noteType,
        specialty_code: clinicInfo.specialty_code,
        clinic_id: clinicInfo.clinic_id,
        user_role: userRole || null,
        encounter_type: clinicInfo.visit_type,
        patient_context: patientContext || null,
      };
      result[noteType] = resolveTemplateClientSide(allTemplates, ctx);
    }

    return result;
  }, [allTemplates, clinicInfo, userRole, patientContext]);

  const getTemplate = useMemo(() => {
    return (noteType: ClinicalNoteType) => resolved[noteType] || null;
  }, [resolved]);

  return {
    templates: resolved,
    isLoading: clinicLoading || templatesLoading,
    getTemplate,
    clinicInfo: clinicInfo || null,
  };
}
