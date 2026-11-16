/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - MEDICAL RECORDS HOOKS
 * React Query hooks for patient medical records
 * =============================================================================
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  getPatientMedicalRecordView,
  getPatientEncounters,
  getEncounterDetails,
  getPatientVitalsTrend,
  getEncountersByProblem,
  PatientMedicalRecordView,
  PaginatedEncounters,
  EncounterDetail,
  VitalsTrend,
  MedicalRecordsFilters,
} from '../api/medical-records.api';

// =============================================================================
// Query Keys
// =============================================================================

export const medicalRecordsKeys = {
  all: ['medical-records'] as const,
  patient: (patientId: string) =>
    [...medicalRecordsKeys.all, 'patient', patientId] as const,
  view: (patientId: string, filters?: MedicalRecordsFilters) =>
    [...medicalRecordsKeys.patient(patientId), 'view', filters] as const,
  encounters: (patientId: string, filters?: MedicalRecordsFilters) =>
    [...medicalRecordsKeys.patient(patientId), 'encounters', filters] as const,
  encounterDetail: (encounterId: string) =>
    [...medicalRecordsKeys.all, 'encounter', encounterId] as const,
  vitalsTrend: (patientId: string, timeframe: string) =>
    [
      ...medicalRecordsKeys.patient(patientId),
      'vitals-trend',
      timeframe,
    ] as const,
  byProblem: (patientId: string, problemName: string) =>
    [
      ...medicalRecordsKeys.patient(patientId),
      'by-problem',
      problemName,
    ] as const,
};

// =============================================================================
// Hooks
// =============================================================================

/**
 * Get complete patient medical records view
 */
export function usePatientMedicalRecords(
  patientId: string | null,
  filters?: MedicalRecordsFilters,
) {
  return useQuery({
    queryKey: medicalRecordsKeys.view(patientId || '', filters),
    queryFn: () => getPatientMedicalRecordView(patientId!, filters),
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (previously cacheTime)
  });
}

/**
 * Get paginated patient encounters with infinite scroll
 */
export function usePatientEncountersInfinite(
  patientId: string | null,
  filters?: MedicalRecordsFilters,
) {
  return useInfiniteQuery({
    queryKey: medicalRecordsKeys.encounters(patientId || '', filters),
    queryFn: ({ pageParam = 1 }) =>
      getPatientEncounters(patientId!, pageParam, 10, filters),
    enabled: !!patientId,
    getNextPageParam: (lastPage: PaginatedEncounters) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get paginated patient encounters (non-infinite)
 */
export function usePatientEncounters(
  patientId: string | null,
  page: number = 1,
  limit: number = 10,
  filters?: MedicalRecordsFilters,
) {
  return useQuery({
    queryKey: [
      ...medicalRecordsKeys.encounters(patientId || '', filters),
      page,
      limit,
    ],
    queryFn: () => getPatientEncounters(patientId!, page, limit, filters),
    enabled: !!patientId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get full encounter details
 */
export function useEncounterDetails(encounterId: string | null) {
  return useQuery({
    queryKey: medicalRecordsKeys.encounterDetail(encounterId || ''),
    queryFn: () => getEncounterDetails(encounterId!),
    enabled: !!encounterId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get patient vitals trend for charts
 */
export function usePatientVitalsTrend(
  patientId: string | null,
  timeframe: '3m' | '6m' | '1y' | 'all' = '6m',
) {
  return useQuery({
    queryKey: medicalRecordsKeys.vitalsTrend(patientId || '', timeframe),
    queryFn: () => getPatientVitalsTrend(patientId!, timeframe),
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get encounters filtered by problem/diagnosis
 */
export function useEncountersByProblem(
  patientId: string | null,
  problemName: string | null,
  page: number = 1,
  limit: number = 10,
) {
  return useQuery({
    queryKey: [
      ...medicalRecordsKeys.byProblem(patientId || '', problemName || ''),
      page,
    ],
    queryFn: () =>
      getEncountersByProblem(patientId!, problemName!, page, limit),
    enabled: !!patientId && !!problemName,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get encounters by problem with infinite scroll
 */
export function useEncountersByProblemInfinite(
  patientId: string | null,
  problemName: string | null,
) {
  return useInfiniteQuery({
    queryKey: medicalRecordsKeys.byProblem(patientId || '', problemName || ''),
    queryFn: ({ pageParam = 1 }) =>
      getEncountersByProblem(patientId!, problemName!, pageParam, 10),
    enabled: !!patientId && !!problemName,
    getNextPageParam: (lastPage: PaginatedEncounters) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
  });
}
