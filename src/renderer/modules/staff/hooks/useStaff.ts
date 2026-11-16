import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import * as staffApi from '../api/staff.api';
import * as clinicsApi from '../api/clinics.api';
import { Staff } from '../../../types/database.types';

const useMutation = <
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: Omit<
    UseBackgroundMutationOptions<TData, TError, TVariables, TContext>,
    'backgroundScope' | 'maxRetries'
  > & {
    backgroundScope?: string;
    maxRetries?: number;
  },
) => {
  const {
    backgroundScope = 'staff:write',
    maxRetries = 4,
    ...restOptions
  } = options;

  return useBackgroundMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    backgroundScope,
    maxRetries,
  });
};

// Re-export types from API
export type { DoctorOption, ClinicalStaffOption } from '../api/staff.api';

export const staffKeys = {
  all: ['staff'] as const,
  list: () => [...staffKeys.all, 'list'] as const,
  detail: (id: string) => [...staffKeys.all, 'detail', id] as const,
  clinics: () => [...staffKeys.all, 'clinics'] as const,
  doctors: (department?: string) =>
    [...staffKeys.all, 'doctors', department] as const,
  doctorSpecialties: () => [...staffKeys.all, 'doctorSpecialties'] as const,
  clinicalStaff: () => [...staffKeys.all, 'clinicalStaff'] as const,
};

export function useStaffList() {
  return useQuery({
    queryKey: staffKeys.list(),
    queryFn: () => staffApi.getStaffList(),
  });
}

export function useClinics() {
  return useQuery({
    queryKey: staffKeys.clinics(),
    queryFn: () => clinicsApi.getClinics(),
  });
}

/**
 * Hook to fetch doctors (staff with role='doctor')
 * @param department - Optional department/specialty to filter by
 */
export function useDoctors(department?: string) {
  return useQuery({
    queryKey: staffKeys.doctors(department),
    queryFn: () => staffApi.getDoctors(department),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Hook to fetch all clinical staff (doctors and nurses)
 * For care team management
 */
export function useClinicalStaff() {
  return useQuery({
    queryKey: staffKeys.clinicalStaff(),
    queryFn: () => staffApi.getClinicalStaff(),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Hook to fetch unique specialties/departments from active doctors
 */
export function useDoctorSpecialties() {
  return useQuery({
    queryKey: staffKeys.doctorSpecialties(),
    queryFn: () => staffApi.getDoctorSpecialties(),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}

export function useStaff(id: string) {
  return useQuery({
    queryKey: staffKeys.detail(id),
    queryFn: () => staffApi.getStaffById(id),
    enabled: !!id,
  });
}

export function useNextStaffId(role: string) {
  return useQuery({
    queryKey: ['staff', 'nextId', role],
    queryFn: () => staffApi.getNextStaffId(role),
    enabled: !!role,
    staleTime: 0, // Keep at 0 - must always fetch fresh ID for unique generation
    gcTime: 0, // Don't cache this at all
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (staff: Partial<Staff> & { password?: string }) =>
      staffApi.createStaff(staff),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Staff> }) =>
      staffApi.updateStaff(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => staffApi.deleteStaff(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.all }),
  });
}
