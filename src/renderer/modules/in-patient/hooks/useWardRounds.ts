// =============================================================================
// XENOCARE EMR - useWardRounds Hook
// React Query hook for ward round documentation
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import { useAuth } from '../../../contexts/AuthContext';
import * as wardRoundsApi from '../api/ward-rounds.api';
import type { CreateWardRoundNoteDTO } from '../../../types/database.types';
import { admissionKeys } from './useAdmissions';
import { notifyWardRoundCompleted } from '../../../lib/notifications/care-team.service';

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
    backgroundScope: 'inpatient:ward-rounds:write',
    maxRetries: 4,
    ...options,
  });

// Query keys
export const wardRoundKeys = {
  all: ['ward-rounds'] as const,
  lists: () => [...wardRoundKeys.all, 'list'] as const,
  byAdmission: (admissionId: string) =>
    [...wardRoundKeys.lists(), 'admission', admissionId] as const,
  byDate: (admissionId: string, date: string) =>
    [...wardRoundKeys.byAdmission(admissionId), date] as const,
  latest: (admissionId: string) =>
    [...wardRoundKeys.byAdmission(admissionId), 'latest'] as const,
  byPhysician: (physicianId: string) =>
    [...wardRoundKeys.lists(), 'physician', physicianId] as const,
  todayByWard: (wardId: string) =>
    [...wardRoundKeys.lists(), 'today', 'ward', wardId] as const,
  detail: (id: string) => [...wardRoundKeys.all, 'detail', id] as const,
  summary: (wardId: string, startDate: string, endDate: string) =>
    [...wardRoundKeys.all, 'summary', wardId, startDate, endDate] as const,
};

/**
 * Hook to fetch ward round notes for an admission
 */
export function useWardRoundNotes(admissionId: string) {
  return useQuery({
    queryKey: wardRoundKeys.byAdmission(admissionId),
    queryFn: () => wardRoundsApi.getWardRoundNotes(admissionId),
    enabled: !!admissionId,
  });
}

/**
 * Hook to fetch ward round notes for a specific date
 */
export function useWardRoundNotesByDate(admissionId: string, date: string) {
  return useQuery({
    queryKey: wardRoundKeys.byDate(admissionId, date),
    queryFn: () => wardRoundsApi.getWardRoundNotesByDate(admissionId, date),
    enabled: !!admissionId && !!date,
  });
}

/**
 * Hook to fetch latest ward round note
 */
export function useLatestWardRoundNote(admissionId: string) {
  return useQuery({
    queryKey: wardRoundKeys.latest(admissionId),
    queryFn: () => wardRoundsApi.getLatestWardRoundNote(admissionId),
    enabled: !!admissionId,
  });
}

/**
 * Hook to fetch ward round notes by physician
 */
export function useWardRoundNotesByPhysician(
  startDate?: string,
  endDate?: string,
) {
  const { staff } = useAuth();
  const physicianId = staff?.id;

  return useQuery({
    queryKey: wardRoundKeys.byPhysician(physicianId || ''),
    queryFn: () =>
      wardRoundsApi.getWardRoundNotesByPhysician(
        physicianId!,
        startDate,
        endDate,
      ),
    enabled: !!physicianId,
  });
}

/**
 * Hook to fetch today's ward round notes for a ward
 */
export function useTodaysWardRoundNotes(wardId: string) {
  return useQuery({
    queryKey: wardRoundKeys.todayByWard(wardId),
    queryFn: () => wardRoundsApi.getTodaysWardRoundNotes(wardId),
    enabled: !!wardId,
  });
}

/**
 * Hook to fetch a single ward round note
 */
export function useWardRoundNote(noteId: string) {
  return useQuery({
    queryKey: wardRoundKeys.detail(noteId),
    queryFn: () => wardRoundsApi.getWardRoundNoteById(noteId),
    enabled: !!noteId,
  });
}

/**
 * Hook to fetch ward round summary
 */
export function useWardRoundSummary(
  wardId: string,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: wardRoundKeys.summary(wardId, startDate, endDate),
    queryFn: () =>
      wardRoundsApi.getWardRoundSummary(wardId, startDate, endDate),
    enabled: !!wardId && !!startDate && !!endDate,
  });
}

/**
 * Hook to create a ward round note
 */
export function useCreateWardRoundNote() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const userId = staff?.id;

  return useMutation({
    mutationFn: (data: CreateWardRoundNoteDTO) =>
      wardRoundsApi.createWardRoundNote(data, userId!),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: wardRoundKeys.byAdmission(data.admission_id),
      });
      queryClient.invalidateQueries({
        queryKey: wardRoundKeys.latest(data.admission_id),
      });
      queryClient.invalidateQueries({
        queryKey: wardRoundKeys.byPhysician(userId || ''),
      });
      // Also invalidate admission detail to update last round info
      queryClient.invalidateQueries({
        queryKey: admissionKeys.detail(data.admission_id),
      });

      // Notify care team about ward round completion
      if (data.encounter_id && userId) {
        const doctorName = staff?.first_name
          ? `Dr. ${staff.first_name} ${staff.last_name || ''}`.trim()
          : 'Doctor';
        notifyWardRoundCompleted(
          data.encounter_id,
          (variables as any).patient_name || 'Patient',
          doctorName,
          data.id,
          userId,
        ).catch(() => {}); // Non-fatal
      }
    },
  });
}

/**
 * Hook to update a ward round note
 */
export function useUpdateWardRoundNote() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const userId = staff?.id;

  return useMutation({
    mutationFn: ({
      noteId,
      updates,
    }: {
      noteId: string;
      updates: Partial<CreateWardRoundNoteDTO>;
    }) => wardRoundsApi.updateWardRoundNote(noteId, updates, userId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: wardRoundKeys.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: wardRoundKeys.byAdmission(data.admission_id),
      });
      queryClient.invalidateQueries({
        queryKey: wardRoundKeys.latest(data.admission_id),
      });
    },
  });
}

/**
 * Hook to add participant to ward round
 */
export function useAddWardRoundParticipant() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const userId = staff?.id;

  return useMutation({
    mutationFn: ({
      noteId,
      participantId,
      role,
    }: {
      noteId: string;
      participantId: string;
      role: string;
    }) =>
      wardRoundsApi.addWardRoundParticipant(
        noteId,
        participantId,
        role,
        userId!,
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: wardRoundKeys.detail(data.id),
      });
    },
  });
}

/**
 * Hook to add order to ward round note
 */
export function useAddWardRoundOrder() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const userId = staff?.id;

  return useMutation({
    mutationFn: ({
      noteId,
      orderType,
      description,
      urgency,
    }: {
      noteId: string;
      orderType: string;
      description: string;
      urgency: string;
    }) =>
      wardRoundsApi.addWardRoundOrder(
        noteId,
        orderType,
        description,
        urgency,
        userId!,
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: wardRoundKeys.detail(data.id),
      });
    },
  });
}

/**
 * Hook to delete a ward round note
 */
export function useDeleteWardRoundNote() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const userId = staff?.id;

  return useMutation({
    mutationFn: (noteId: string) =>
      wardRoundsApi.deleteWardRoundNote(noteId, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wardRoundKeys.lists() });
    },
  });
}
