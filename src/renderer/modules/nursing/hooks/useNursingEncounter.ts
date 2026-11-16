/**
 * =============================================================================
 * NURSING MODULE - ENCOUNTER CONTEXT HOOK
 * =============================================================================
 *
 * Provides encounter state and permissions for nursing components.
 * Enforces the "one encounter, many roles, different permissions" principle.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../api/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import {
  isEncounterWritable,
  validateNursingAction,
  NURSE_CONTENT_VISIBILITY,
  NursingEncounterContext,
} from '../../../lib/encounter/nursing-integration';
import {
  EncounterAction,
  EncounterRole,
} from '../../../lib/encounter/access-control';

// =============================================================================
// TYPES
// =============================================================================

export interface EncounterInfo {
  id: string;
  visit_id: string;
  encounter_number: string;
  status: string;
  visit_type: string;
  created_at: string;
  current_stage: string;
  chief_complaint: string | null;
  clinic?: { clinic_name: string } | null;
}

export interface UseNursingEncounterOptions {
  patientId: string;
  encounterId?: string | null;
  autoSelectActive?: boolean;
}

export interface UseNursingEncounterResult {
  // Current encounter
  currentEncounter: EncounterInfo | null;
  isLoading: boolean;
  error: Error | null;

  // Encounter list
  patientEncounters: EncounterInfo[];
  activeEncounter: EncounterInfo | null;

  // State
  isWritable: boolean;
  isHistorical: boolean;

  // Actions
  selectEncounter: (encounterId: string) => void;
  selectActiveEncounter: () => void;

  // Permissions
  canPerformAction: (action: EncounterAction) => boolean;
  getActionValidation: (action: EncounterAction) => {
    allowed: boolean;
    reason: string;
  };

  // Content visibility
  isContentVisible: (
    contentType: keyof typeof NURSE_CONTENT_VISIBILITY,
  ) => boolean;
  isContentWritable: (
    contentType: keyof typeof NURSE_CONTENT_VISIBILITY,
  ) => boolean;

  // Context for child components
  context: NursingEncounterContext | null;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useNursingEncounter({
  patientId,
  encounterId,
  autoSelectActive = true,
}: UseNursingEncounterOptions): UseNursingEncounterResult {
  const { user } = useAuth();
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(
    encounterId || null,
  );

  const ENCOUNTER_SELECT = `
    id,
    visit_id,
    encounter_number,
    status,
    visit_type,
    created_at,
    current_stage,
    chief_complaint,
    clinic:clinics!visits_clinic_id_fkey(clinic_name)
  `;

  // Fetch all encounters for patient
  const {
    data: encounters,
    isLoading: encountersLoading,
    error: encountersError,
  } = useQuery({
    queryKey: ['patient-encounters', patientId, encounterId],
    queryFn: async () => {
      // Primary path: fetch by patient_id
      if (patientId) {
        const { data, error } = await supabase
          .from('visits')
          .select(ENCOUNTER_SELECT)
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data && data.length > 0) return data as EncounterInfo[];
      }

      // Fallback: if patientId missing/empty but encounterId provided, fetch single encounter
      if (encounterId) {
        const { data, error } = await supabase
          .from('visits')
          .select(ENCOUNTER_SELECT)
          .eq('id', encounterId)
          .limit(1);

        if (error) throw error;
        return (data || []) as EncounterInfo[];
      }

      return [];
    },
    enabled: !!patientId || !!encounterId,
    staleTime: 30000,
  });

  // Find active encounter
  const activeEncounter = useMemo(() => {
    return encounters?.find((e) => e.status === 'Active') || null;
  }, [encounters]);

  // Auto-select active encounter on mount
  useEffect(() => {
    if (autoSelectActive && !selectedEncounterId && activeEncounter) {
      setSelectedEncounterId(activeEncounter.id);
    }
  }, [autoSelectActive, selectedEncounterId, activeEncounter]);

  // Update selected encounter when prop changes
  useEffect(() => {
    if (encounterId && encounterId !== selectedEncounterId) {
      setSelectedEncounterId(encounterId);
    }
  }, [encounterId]);

  // Get current encounter details
  const currentEncounter = useMemo(() => {
    if (!selectedEncounterId || !encounters) return null;
    return encounters.find((e) => e.id === selectedEncounterId) || null;
  }, [selectedEncounterId, encounters]);

  // Determine if encounter is writable
  const isWritable = useMemo(() => {
    if (!currentEncounter) return false;
    return isEncounterWritable(currentEncounter.status);
  }, [currentEncounter]);

  // Determine if viewing historical encounter
  const isHistorical = useMemo(() => {
    if (!currentEncounter || !activeEncounter) return false;
    return currentEncounter.id !== activeEncounter.id;
  }, [currentEncounter, activeEncounter]);

  // Action handlers
  const selectEncounter = useCallback((encId: string) => {
    setSelectedEncounterId(encId);
  }, []);

  const selectActiveEncounter = useCallback(() => {
    if (activeEncounter) {
      setSelectedEncounterId(activeEncounter.id);
    }
  }, [activeEncounter]);

  // Permission checks
  const canPerformAction = useCallback(
    (action: EncounterAction): boolean => {
      if (!currentEncounter) return false;
      const result = validateNursingAction(
        action,
        currentEncounter.status,
        'nurse',
      );
      return result.allowed;
    },
    [currentEncounter],
  );

  const getActionValidation = useCallback(
    (action: EncounterAction) => {
      if (!currentEncounter) {
        return { allowed: false, reason: 'No encounter selected' };
      }
      return validateNursingAction(action, currentEncounter.status, 'nurse');
    },
    [currentEncounter],
  );

  // Content visibility checks
  const isContentVisible = useCallback(
    (contentType: keyof typeof NURSE_CONTENT_VISIBILITY): boolean => {
      return NURSE_CONTENT_VISIBILITY[contentType]?.view ?? false;
    },
    [],
  );

  const isContentWritable = useCallback(
    (contentType: keyof typeof NURSE_CONTENT_VISIBILITY): boolean => {
      if (!isWritable) return false; // Encounter must be writable
      return NURSE_CONTENT_VISIBILITY[contentType]?.write ?? false;
    },
    [isWritable],
  );

  // Build context object for child components
  const context: NursingEncounterContext | null = useMemo(() => {
    if (!currentEncounter) return null;

    return {
      encounterId: currentEncounter.id,
      patientId,
      status: currentEncounter.status as
        | 'Active'
        | 'Completed'
        | 'Closed'
        | 'Cancelled',
      isWritable,
      nurseRole: 'nurse' as EncounterRole,
      allowedActions: [
        'view',
        'add_vitals',
        'add_nursing_notes',
      ] as EncounterAction[],
      restrictions: isWritable
        ? []
        : ['Encounter is not active - read only access'],
    };
  }, [currentEncounter, patientId, isWritable]);

  return {
    currentEncounter,
    isLoading: encountersLoading,
    error: encountersError as Error | null,
    patientEncounters: encounters || [],
    activeEncounter,
    isWritable,
    isHistorical,
    selectEncounter,
    selectActiveEncounter,
    canPerformAction,
    getActionValidation,
    isContentVisible,
    isContentWritable,
    context,
  };
}

// =============================================================================
// ENCOUNTER WRITE GUARD HOOK
// =============================================================================

/**
 * Hook to guard write operations in nursing components.
 * Returns a function that validates and optionally executes write operations.
 */
export function useEncounterWriteGuard(encounterId: string | null) {
  const [validationError, setValidationError] = useState<string | null>(null);

  const guardWrite = useCallback(
    async <T>(
      action: EncounterAction,
      operation: () => Promise<T>,
      options?: { showError?: boolean },
    ): Promise<T | null> => {
      setValidationError(null);

      if (!encounterId) {
        const error = 'No encounter selected. Cannot perform write operation.';
        setValidationError(error);
        if (options?.showError) console.error(error);
        return null;
      }

      // Fetch current encounter status
      const { data: encounter, error } = await supabase
        .from('visits')
        .select('status')
        .eq('id', encounterId)
        .single();

      if (error || !encounter) {
        const errMsg = 'Failed to validate encounter status.';
        setValidationError(errMsg);
        if (options?.showError) console.error(errMsg, error);
        return null;
      }

      // Validate action
      const validation = validateNursingAction(
        action,
        encounter.status,
        'nurse',
      );
      if (!validation.allowed) {
        setValidationError(validation.reason);
        if (options?.showError) console.error(validation.reason);
        return null;
      }

      // Execute operation
      try {
        return await operation();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Operation failed';
        setValidationError(errMsg);
        throw err;
      }
    },
    [encounterId],
  );

  return {
    guardWrite,
    validationError,
    clearError: () => setValidationError(null),
  };
}

export default useNursingEncounter;
