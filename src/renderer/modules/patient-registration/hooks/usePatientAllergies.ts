import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPatientAllergies,
  getPatientAllergyReview,
  savePatientAllergies,
  type PatientAllergyInput,
} from '../api/patient-allergies.api';

export const patientAllergyKeys = {
  all: ['patient-allergies'] as const,
  list: (patientId: string) =>
    [...patientAllergyKeys.all, 'list', patientId] as const,
  review: (patientId: string) =>
    [...patientAllergyKeys.all, 'review', patientId] as const,
};

export function usePatientAllergies(patientId?: string | null) {
  return useQuery({
    queryKey: patientAllergyKeys.list(patientId || ''),
    queryFn: () => getPatientAllergies(patientId as string),
    enabled: Boolean(patientId),
    retry: false,
  });
}

export function usePatientAllergyReview(patientId?: string | null) {
  return useQuery({
    queryKey: patientAllergyKeys.review(patientId || ''),
    queryFn: () => getPatientAllergyReview(patientId as string),
    enabled: Boolean(patientId),
    retry: false,
  });
}

export function useSavePatientAllergies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      patientId: string;
      noKnownAllergies: boolean;
      entries: PatientAllergyInput[];
      recordedBy?: string | null;
    }) => savePatientAllergies(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: patientAllergyKeys.all });
      queryClient.invalidateQueries({
        queryKey: ['patients', 'detail', variables.patientId],
      });
    },
  });
}
