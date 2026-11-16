// =============================================================================
// useChiefComplaints Hook
// Manages chief complaints with encounter-centric architecture
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import { supabase } from '../../../api/supabaseClient';
import {
  ChiefComplaintCatalogue,
  PatientChiefComplaint,
  PatientChiefComplaintDTO,
  DurationUnit,
} from '../../../types/database.types';

const useMutation = <
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: Omit<
    UseBackgroundMutationOptions<TData, TError, TVariables, TContext>,
    'backgroundScope' | 'maxRetries'
  >,
) =>
  useBackgroundMutation<TData, TError, TVariables, TContext>({
    backgroundScope: 'consultation:chief-complaints:write',
    maxRetries: 4,
    ...options,
  });

// =============================================================================
// QUERY KEYS
// =============================================================================

export const chiefComplaintKeys = {
  all: ['chief-complaints'] as const,
  catalogue: () => [...chiefComplaintKeys.all, 'catalogue'] as const,
  patientComplaints: (encounterId: string) =>
    [...chiefComplaintKeys.all, 'patient', encounterId] as const,
  patientHistory: (patientId: string) =>
    [...chiefComplaintKeys.all, 'history', patientId] as const,
};

// =============================================================================
// FETCH CATALOGUE
// =============================================================================

export function useChiefComplaintCatalogue() {
  return useQuery({
    queryKey: chiefComplaintKeys.catalogue(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chief_complaint_catalogue')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as ChiefComplaintCatalogue[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes - catalogue rarely changes
  });
}

// =============================================================================
// FETCH PATIENT COMPLAINTS FOR ENCOUNTER
// =============================================================================

export function useEncounterComplaints(encounterId: string | null) {
  return useQuery({
    queryKey: chiefComplaintKeys.patientComplaints(encounterId || ''),
    queryFn: async () => {
      if (!encounterId) return [];

      const { data, error } = await supabase
        .from('patient_chief_complaints')
        .select(
          `
          *,
          chief_complaint_catalogue (
            complaint_name,
            complaint_code,
            category
          )
        `,
        )
        .eq('encounter_id', encounterId)
        .order('is_primary', { ascending: false });

      if (error) throw error;

      // Flatten the joined data
      return (data || []).map((item: any) => ({
        ...item,
        complaint_name: item.chief_complaint_catalogue?.complaint_name,
        complaint_code: item.chief_complaint_catalogue?.complaint_code,
        category: item.chief_complaint_catalogue?.category,
      })) as PatientChiefComplaint[];
    },
    enabled: !!encounterId,
  });
}

// =============================================================================
// FETCH PATIENT COMPLAINT HISTORY
// =============================================================================

export function usePatientComplaintHistory(patientId: string | null) {
  return useQuery({
    queryKey: chiefComplaintKeys.patientHistory(patientId || ''),
    queryFn: async () => {
      if (!patientId) return [];

      const { data, error } = await supabase
        .from('v_patient_complaints')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!patientId,
  });
}

// =============================================================================
// SAVE COMPLAINTS FOR ENCOUNTER (with Optimistic Updates)
// =============================================================================

interface SaveComplaintsParams {
  patientId: string;
  emrNumber: string;
  encounterId: string;
  consultationId?: string;
  complaints: (PatientChiefComplaintDTO & {
    is_custom?: boolean;
    complaint_name?: string;
    category?: string;
  })[];
  recordedBy?: string;
}

// Type for optimistic complaint data
interface OptimisticComplaint {
  id: string;
  patient_id: string;
  emr_number: string;
  encounter_id: string;
  consultation_id: string | null;
  complaint_id: string;
  is_primary: boolean;
  duration_value: number;
  duration_unit: DurationUnit;
  notes: string | null;
  complaint_name?: string;
  complaint_code?: string;
  category?: string;
  created_at: string;
  _optimistic?: boolean;
}

export function useSaveEncounterComplaints() {
  const queryClient = useQueryClient();

  return useMutation({
    // Optimistic update - show changes immediately before server confirms
    onMutate: async (variables: SaveComplaintsParams) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: chiefComplaintKeys.patientComplaints(variables.encounterId),
      });

      // Snapshot the previous value
      const previousComplaints = queryClient.getQueryData<
        OptimisticComplaint[]
      >(chiefComplaintKeys.patientComplaints(variables.encounterId));

      // Optimistically update to the new value
      const optimisticComplaints: OptimisticComplaint[] =
        variables.complaints.map((c, index) => ({
          id: `optimistic-${index}-${Date.now()}`,
          patient_id: variables.patientId,
          emr_number: variables.emrNumber,
          encounter_id: variables.encounterId,
          consultation_id: variables.consultationId || null,
          complaint_id: c.complaint_id,
          is_primary: c.is_primary,
          duration_value: c.duration_value,
          duration_unit: c.duration_unit,
          notes: c.notes || null,
          complaint_name: c.complaint_name,
          complaint_code: c.is_custom ? 'CUSTOM' : c.complaint_id,
          category: c.category,
          created_at: new Date().toISOString(),
          _optimistic: true,
        }));

      queryClient.setQueryData(
        chiefComplaintKeys.patientComplaints(variables.encounterId),
        optimisticComplaints,
      );

      // Return context with the snapshotted value
      return { previousComplaints };
    },
    mutationFn: async ({
      patientId,
      emrNumber,
      encounterId,
      consultationId,
      complaints,
      recordedBy,
    }: SaveComplaintsParams) => {
      // First, get existing complaint IDs for this encounter to know what to delete
      const { data: existingComplaints } = await supabase
        .from('patient_chief_complaints')
        .select('id, complaint_id')
        .eq('encounter_id', encounterId);

      const existingComplaintIds = new Set(
        existingComplaints?.map((c) => c.complaint_id) || [],
      );

      // If no new complaints, delete all existing and return
      if (!complaints.length) {
        if (existingComplaints && existingComplaints.length > 0) {
          const { error: deleteError } = await supabase
            .from('patient_chief_complaints')
            .delete()
            .eq('encounter_id', encounterId);
          if (deleteError) throw deleteError;
        }
        return [];
      }

      // UUID regex for validation
      const UUID_REGEX =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // Process complaints - resolve UUIDs and handle custom complaints
      const processedComplaints = await Promise.all(
        complaints.map(async (c) => {
          // Handle custom complaints - add to catalogue first
          if (c.is_custom && c.complaint_name) {
            // Generate a unique code for custom complaint
            const customCode = `CUSTOM-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

            // Insert into catalogue
            const { data: newCatalogueEntry, error: catalogueError } =
              await supabase
                .from('chief_complaint_catalogue')
                .insert({
                  complaint_name: c.complaint_name,
                  complaint_code: customCode,
                  category: c.category || 'General',
                  description: 'Custom complaint added by doctor',
                  is_active: true,
                  display_order: 999, // Put at end
                })
                .select()
                .single();

            if (catalogueError) {
              console.error(
                'Failed to add custom complaint to catalogue:',
                catalogueError,
              );
              throw catalogueError;
            }

            // Return with the new complaint_id from catalogue
            return {
              ...c,
              complaint_id: newCatalogueEntry.complaint_id,
            };
          }

          // If complaint_id is already a UUID, use it as-is
          if (UUID_REGEX.test(c.complaint_id)) {
            return c;
          }

          // Otherwise, complaint_id is a code (like "MH-004") - look up the UUID
          const { data: catalogueEntry, error: lookupError } = await supabase
            .from('chief_complaint_catalogue')
            .select('complaint_id')
            .eq('complaint_code', c.complaint_id)
            .maybeSingle();

          if (lookupError) {
            console.error('Failed to look up complaint by code:', lookupError);
            throw lookupError;
          }

          if (!catalogueEntry) {
            console.error(
              `Complaint not found in catalogue: ${c.complaint_id}`,
            );
            throw new Error(`Complaint not found: ${c.complaint_id}`);
          }

          return {
            ...c,
            complaint_id: catalogueEntry.complaint_id,
          };
        }),
      );

      // Determine which complaints to insert, update, or delete
      const newComplaintIds = new Set(
        processedComplaints.map((c) => c.complaint_id),
      );

      // Delete complaints that are no longer in the list
      const complaintsToDelete =
        existingComplaints?.filter(
          (c) => !newComplaintIds.has(c.complaint_id),
        ) || [];

      if (complaintsToDelete.length > 0) {
        const deleteIds = complaintsToDelete.map((c) => c.id);
        const { error: deleteError } = await supabase
          .from('patient_chief_complaints')
          .delete()
          .in('id', deleteIds);
        if (deleteError) throw deleteError;
      }

      // Separate into updates and inserts
      const complaintsToUpdate = processedComplaints.filter((c) =>
        existingComplaintIds.has(c.complaint_id),
      );
      const complaintsToInsert = processedComplaints.filter(
        (c) => !existingComplaintIds.has(c.complaint_id),
      );

      // Update existing complaints
      for (const c of complaintsToUpdate) {
        const existingRecord = existingComplaints?.find(
          (ec) => ec.complaint_id === c.complaint_id,
        );
        if (existingRecord) {
          const { error: updateError } = await supabase
            .from('patient_chief_complaints')
            .update({
              is_primary: c.is_primary,
              duration_value: c.duration_value,
              duration_unit: c.duration_unit,
              notes: c.notes || null,
              consultation_id: consultationId || null,
            })
            .eq('id', existingRecord.id);
          if (updateError) throw updateError;
        }
      }

      // Insert new complaints
      if (complaintsToInsert.length > 0) {
        const recordsToInsert = complaintsToInsert.map((c) => ({
          patient_id: patientId,
          emr_number: emrNumber,
          encounter_id: encounterId,
          consultation_id: consultationId || null,
          complaint_id: c.complaint_id,
          is_primary: c.is_primary,
          duration_value: c.duration_value,
          duration_unit: c.duration_unit,
          notes: c.notes || null,
          recorded_by: recordedBy || null,
        }));

        const { error: insertError } = await supabase
          .from('patient_chief_complaints')
          .insert(recordsToInsert);

        if (insertError) throw insertError;
      }

      // Fetch and return all complaints for this encounter
      const { data, error } = await supabase
        .from('patient_chief_complaints')
        .select('*')
        .eq('encounter_id', encounterId);

      if (error) throw error;

      // Invalidate catalogue cache if we added custom complaints
      if (complaints.some((c) => c.is_custom)) {
        queryClient.invalidateQueries({
          queryKey: chiefComplaintKeys.catalogue(),
        });
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chiefComplaintKeys.patientComplaints(variables.encounterId),
      });
      queryClient.invalidateQueries({
        queryKey: chiefComplaintKeys.patientHistory(variables.patientId),
      });
    },
    // Rollback on error
    onError: (err, variables, context) => {
      console.error('Failed to save complaints:', err);
      // Rollback to the previous value
      if (context?.previousComplaints) {
        queryClient.setQueryData(
          chiefComplaintKeys.patientComplaints(variables.encounterId),
          context.previousComplaints,
        );
      }
    },
    // Always refetch after error or success
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: chiefComplaintKeys.patientComplaints(variables.encounterId),
      });
    },
  });
}

// =============================================================================
// ADD SINGLE COMPLAINT (with Optimistic Updates)
// =============================================================================

interface AddComplaintParams {
  patientId: string;
  emrNumber: string;
  encounterId: string;
  consultationId?: string;
  complaint: PatientChiefComplaintDTO & {
    complaint_name?: string;
    category?: string;
  };
  recordedBy?: string;
}

export function useAddComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    // Optimistic update
    onMutate: async (variables: AddComplaintParams) => {
      await queryClient.cancelQueries({
        queryKey: chiefComplaintKeys.patientComplaints(variables.encounterId),
      });

      const previousComplaints = queryClient.getQueryData<
        OptimisticComplaint[]
      >(chiefComplaintKeys.patientComplaints(variables.encounterId));

      const optimisticComplaint: OptimisticComplaint = {
        id: `optimistic-${Date.now()}`,
        patient_id: variables.patientId,
        emr_number: variables.emrNumber,
        encounter_id: variables.encounterId,
        consultation_id: variables.consultationId || null,
        complaint_id: variables.complaint.complaint_id,
        is_primary: variables.complaint.is_primary,
        duration_value: variables.complaint.duration_value,
        duration_unit: variables.complaint.duration_unit,
        notes: variables.complaint.notes || null,
        complaint_name: variables.complaint.complaint_name,
        complaint_code: variables.complaint.complaint_id,
        category: variables.complaint.category,
        created_at: new Date().toISOString(),
        _optimistic: true,
      };

      queryClient.setQueryData(
        chiefComplaintKeys.patientComplaints(variables.encounterId),
        [...(previousComplaints || []), optimisticComplaint],
      );

      return { previousComplaints };
    },
    mutationFn: async ({
      patientId,
      emrNumber,
      encounterId,
      consultationId,
      complaint,
      recordedBy,
    }: AddComplaintParams) => {
      const { data, error } = await supabase
        .from('patient_chief_complaints')
        .insert({
          patient_id: patientId,
          emr_number: emrNumber,
          encounter_id: encounterId,
          consultation_id: consultationId || null,
          complaint_id: complaint.complaint_id,
          is_primary: complaint.is_primary,
          duration_value: complaint.duration_value,
          duration_unit: complaint.duration_unit,
          notes: complaint.notes || null,
          recorded_by: recordedBy || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onError: (err, variables, context) => {
      if (context?.previousComplaints) {
        queryClient.setQueryData(
          chiefComplaintKeys.patientComplaints(variables.encounterId),
          context.previousComplaints,
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: chiefComplaintKeys.patientComplaints(variables.encounterId),
      });
    },
  });
}

// =============================================================================
// UPDATE COMPLAINT (with Optimistic Updates)
// =============================================================================

interface UpdateComplaintParams {
  id: string;
  encounterId: string;
  updates: Partial<{
    is_primary: boolean;
    duration_value: number;
    duration_unit: DurationUnit;
    notes: string;
  }>;
}

export function useUpdateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    // Optimistic update
    onMutate: async (variables: UpdateComplaintParams) => {
      await queryClient.cancelQueries({
        queryKey: chiefComplaintKeys.patientComplaints(variables.encounterId),
      });

      const previousComplaints = queryClient.getQueryData<
        OptimisticComplaint[]
      >(chiefComplaintKeys.patientComplaints(variables.encounterId));

      // Update the specific complaint optimistically
      queryClient.setQueryData(
        chiefComplaintKeys.patientComplaints(variables.encounterId),
        (old: OptimisticComplaint[] | undefined) =>
          old?.map((c) =>
            c.id === variables.id
              ? { ...c, ...variables.updates, _optimistic: true }
              : c,
          ),
      );

      return { previousComplaints };
    },
    mutationFn: async ({ id, updates }: UpdateComplaintParams) => {
      const { data, error } = await supabase
        .from('patient_chief_complaints')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onError: (err, variables, context) => {
      if (context?.previousComplaints) {
        queryClient.setQueryData(
          chiefComplaintKeys.patientComplaints(variables.encounterId),
          context.previousComplaints,
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: chiefComplaintKeys.patientComplaints(variables.encounterId),
      });
    },
  });
}

// =============================================================================
// DELETE COMPLAINT (with Optimistic Updates)
// =============================================================================

interface DeleteComplaintParams {
  id: string;
  encounterId: string;
}

export function useDeleteComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    // Optimistic update - remove immediately
    onMutate: async (variables: DeleteComplaintParams) => {
      await queryClient.cancelQueries({
        queryKey: chiefComplaintKeys.patientComplaints(variables.encounterId),
      });

      const previousComplaints = queryClient.getQueryData<
        OptimisticComplaint[]
      >(chiefComplaintKeys.patientComplaints(variables.encounterId));

      // Remove the complaint optimistically
      queryClient.setQueryData(
        chiefComplaintKeys.patientComplaints(variables.encounterId),
        (old: OptimisticComplaint[] | undefined) =>
          old?.filter((c) => c.id !== variables.id),
      );

      return { previousComplaints };
    },
    mutationFn: async ({ id }: DeleteComplaintParams) => {
      const { error } = await supabase
        .from('patient_chief_complaints')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onError: (err, variables, context) => {
      if (context?.previousComplaints) {
        queryClient.setQueryData(
          chiefComplaintKeys.patientComplaints(variables.encounterId),
          context.previousComplaints,
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: chiefComplaintKeys.patientComplaints(variables.encounterId),
      });
    },
  });
}

// =============================================================================
// SET PRIMARY COMPLAINT (with Optimistic Updates)
// =============================================================================

export function useSetPrimaryComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    // Optimistic update - set primary immediately
    onMutate: async (variables: { id: string; encounterId: string }) => {
      await queryClient.cancelQueries({
        queryKey: chiefComplaintKeys.patientComplaints(variables.encounterId),
      });

      const previousComplaints = queryClient.getQueryData<
        OptimisticComplaint[]
      >(chiefComplaintKeys.patientComplaints(variables.encounterId));

      // Set the selected one as primary, unset others
      queryClient.setQueryData(
        chiefComplaintKeys.patientComplaints(variables.encounterId),
        (old: OptimisticComplaint[] | undefined) =>
          old?.map((c) => ({
            ...c,
            is_primary: c.id === variables.id,
            _optimistic: true,
          })),
      );

      return { previousComplaints };
    },
    mutationFn: async ({
      id,
      encounterId,
    }: {
      id: string;
      encounterId: string;
    }) => {
      // The database trigger will handle unsetting other primaries
      const { data, error } = await supabase
        .from('patient_chief_complaints')
        .update({ is_primary: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onError: (err, variables, context) => {
      if (context?.previousComplaints) {
        queryClient.setQueryData(
          chiefComplaintKeys.patientComplaints(variables.encounterId),
          context.previousComplaints,
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: chiefComplaintKeys.patientComplaints(variables.encounterId),
      });
    },
  });
}
