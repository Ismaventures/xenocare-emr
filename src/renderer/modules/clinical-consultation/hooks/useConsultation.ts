import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '../../../api/supabaseClient';
import * as api from '../api/consultation.api';
import {
  ConsultationDTO,
  ConsultationSearchResult,
  CreateConsultationDTO,
  UpdateConsultationDTO,
  ConsultationSearchParams,
  LabOrderDTO,
  RadiologyOrderDTO,
  PrescriptionOrderDTO,
} from '../dtos/consultation.dto';
import { useAuth } from '../../../contexts/AuthContext';
import { MyPatientsParams } from '../api/consultation.api';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';

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
    backgroundScope = 'consultation:write',
    maxRetries = 4,
    ...restOptions
  } = options;

  return useBackgroundMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    backgroundScope,
    maxRetries,
  });
};

const labMutationKeys = {
  all: ['lab'] as const,
  lists: () => ['lab', 'list'] as const,
};

const radiologyMutationKeys = {
  all: ['radiology'] as const,
  lists: () => ['radiology', 'list'] as const,
};

// =============================================================================
// Query Keys
// =============================================================================

export const consultationKeys = {
  all: ['consultations'] as const,
  lists: () => [...consultationKeys.all, 'list'] as const,
  list: (params: ConsultationSearchParams) =>
    [...consultationKeys.lists(), params] as const,
  details: () => [...consultationKeys.all, 'detail'] as const,
  detail: (id: string) => [...consultationKeys.details(), id] as const,
  patient: (patientId: string) =>
    [...consultationKeys.all, 'patient', patientId] as const,
  myPatients: (params: MyPatientsParams) => ['myPatients', params] as const,
  patientHistory: (patientId: string) => ['patientHistory', patientId] as const,
  catalogues: {
    lab: ['catalogues', 'lab'] as const,
    imaging: ['catalogues', 'imaging'] as const,
    procedures: ['catalogues', 'procedures'] as const,
    drugs: ['catalogues', 'drugs'] as const,
  },
};

// =============================================================================
// Get Consultations
// =============================================================================

export const useConsultations = (params?: ConsultationSearchParams) => {
  return useQuery({
    queryKey: consultationKeys.list(params || {}),
    queryFn: () => api.getConsultations(params),
    staleTime: 1000 * 60 * 2,
  });
};

// =============================================================================
// Get Single Consultation
// =============================================================================

export const useConsultation = (id: string) => {
  return useQuery({
    queryKey: consultationKeys.detail(id),
    queryFn: () => api.getConsultationById(id),
    enabled: !!id,
  });
};

// =============================================================================
// Get Patient Consultations
// =============================================================================

export const usePatientConsultations = (patientId: string) => {
  return useQuery({
    queryKey: consultationKeys.patient(patientId),
    queryFn: () => api.getPatientConsultations(patientId),
    enabled: !!patientId,
    staleTime: 1000 * 60,
  });
};

// =============================================================================
// Create Consultation
// =============================================================================

export const useCreateConsultation = () => {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'consultation:create',
    entityKey: (data) => `patient:${data.patient_id}`,
    maxRetries: 4,
    mutationFn: (data: CreateConsultationDTO) => api.createConsultation(data),
    onMutate: async (newConsultation) => {
      const tempId = `temp-${Date.now()}`;

      await queryClient.cancelQueries({ queryKey: consultationKeys.lists() });

      const previousListSnapshots = queryClient.getQueriesData({
        queryKey: consultationKeys.lists(),
      });

      const optimisticConsultation: ConsultationDTO = {
        consultation_id: tempId,
        patient_id: newConsultation.patient_id,
        visit_id: newConsultation.visit_id || null,
        encounter_id: newConsultation.encounter_id || null,
        clinic_id: newConsultation.clinic_id || null,
        complaints: newConsultation.complaints,
        clinical_notes: newConsultation.clinical_notes || null,
        diagnosis: newConsultation.diagnosis || null,
        treatment_plan: newConsultation.treatment_plan || null,
        follow_up_date: newConsultation.follow_up_date || null,
        follow_up_notes: newConsultation.follow_up_notes || null,
        status: 'Completed',
        consultation_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as ConsultationDTO;

      queryClient.setQueriesData(
        { queryKey: consultationKeys.lists() },
        (old: unknown) => {
          const typedOld = old as ConsultationSearchResult | undefined;
          if (!typedOld || !Array.isArray(typedOld.consultations)) return old;

          const exists = typedOld.consultations.some(
            (c) => c.consultation_id === tempId,
          );

          if (exists) return typedOld;

          return {
            ...typedOld,
            consultations: [
              optimisticConsultation as any,
              ...typedOld.consultations,
            ],
            total:
              typeof typedOld.total === 'number'
                ? typedOld.total + 1
                : typedOld.total,
          } as ConsultationSearchResult;
        },
      );

      return {
        tempId,
        previousListSnapshots,
      };
    },
    onError: (_err, _variables, context) => {
      if (!context?.previousListSnapshots) return;

      for (const [queryKey, snapshot] of context.previousListSnapshots) {
        queryClient.setQueryData(queryKey, snapshot);
      }
    },
    onSuccess: (data, _variables, context) => {
      queryClient.setQueryData(
        consultationKeys.detail(data.consultation_id),
        data,
      );

      queryClient.setQueriesData(
        { queryKey: consultationKeys.lists() },
        (old: unknown) => {
          const typedOld = old as ConsultationSearchResult | undefined;
          if (!typedOld || !Array.isArray(typedOld.consultations)) return old;

          const tempId = context?.tempId;
          let found = false;

          const mapped = typedOld.consultations.map((c) => {
            if (c.consultation_id === data.consultation_id) {
              found = true;
              return { ...c, ...data } as any;
            }

            if (tempId && c.consultation_id === tempId) {
              found = true;
              return { ...c, ...data } as any;
            }

            return c;
          });

          return {
            ...typedOld,
            consultations: found ? mapped : ([data as any, ...mapped] as any),
          } as ConsultationSearchResult;
        },
      );

      queryClient.invalidateQueries({ queryKey: consultationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: consultationKeys.patient(data.patient_id),
      });
      queryClient.invalidateQueries({
        queryKey: consultationKeys.patientHistory(data.patient_id),
      });
    },
  });
};

// =============================================================================
// Update Consultation
// =============================================================================

export const useUpdateConsultation = () => {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'consultation:update',
    entityKey: (data) => `consultation:${data.consultation_id}`,
    maxRetries: 4,
    mutationFn: (data: UpdateConsultationDTO) => api.updateConsultation(data),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({
        queryKey: consultationKeys.detail(updates.consultation_id),
      });
      await queryClient.cancelQueries({ queryKey: consultationKeys.lists() });

      const previousDetail = queryClient.getQueryData(
        consultationKeys.detail(updates.consultation_id),
      );
      const previousListSnapshots = queryClient.getQueriesData({
        queryKey: consultationKeys.lists(),
      });

      queryClient.setQueryData(
        consultationKeys.detail(updates.consultation_id),
        (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          return { ...(old as Record<string, unknown>), ...updates };
        },
      );

      queryClient.setQueriesData(
        { queryKey: consultationKeys.lists() },
        (old: unknown) => {
          const typedOld = old as ConsultationSearchResult | undefined;
          if (!typedOld || !Array.isArray(typedOld.consultations)) return old;

          return {
            ...typedOld,
            consultations: typedOld.consultations.map((c) =>
              c.consultation_id === updates.consultation_id
                ? ({ ...c, ...updates } as any)
                : c,
            ),
          } as ConsultationSearchResult;
        },
      );

      return {
        consultationId: updates.consultation_id,
        previousDetail,
        previousListSnapshots,
      };
    },
    onError: (_err, _variables, context) => {
      if (context?.consultationId) {
        queryClient.setQueryData(
          consultationKeys.detail(context.consultationId),
          context.previousDetail,
        );
      }

      if (context?.previousListSnapshots) {
        for (const [queryKey, snapshot] of context.previousListSnapshots) {
          queryClient.setQueryData(queryKey, snapshot);
        }
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        consultationKeys.detail(data.consultation_id),
        data,
      );

      queryClient.setQueriesData(
        { queryKey: consultationKeys.lists() },
        (old: unknown) => {
          const typedOld = old as ConsultationSearchResult | undefined;
          if (!typedOld || !Array.isArray(typedOld.consultations)) return old;

          return {
            ...typedOld,
            consultations: typedOld.consultations.map((c) =>
              c.consultation_id === data.consultation_id
                ? ({ ...c, ...data } as any)
                : c,
            ),
          } as ConsultationSearchResult;
        },
      );

      queryClient.invalidateQueries({
        queryKey: consultationKeys.detail(data.consultation_id),
      });
      queryClient.invalidateQueries({ queryKey: consultationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: consultationKeys.patientHistory(data.patient_id),
      });
      queryClient.invalidateQueries({
        queryKey: consultationKeys.patient(data.patient_id),
      });
    },
  });
};

// =============================================================================
// Delete Consultation
// =============================================================================

export const useDeleteConsultation = () => {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'consultation:delete',
    entityKey: (consultationId: string) => `consultation:${consultationId}`,
    maxRetries: 4,
    optimisticUpdates: (consultationId) => [
      {
        queryKey: consultationKeys.detail(consultationId),
        updater: () => null,
      },
      {
        queryKey: consultationKeys.lists(),
        updater: (old: unknown) => {
          const typedOld = old as ConsultationSearchResult | undefined;
          if (!typedOld || !Array.isArray(typedOld.consultations)) return old;

          const next = typedOld.consultations.filter(
            (c) => c.consultation_id !== consultationId,
          );

          if (next.length === typedOld.consultations.length) return old;

          return {
            ...typedOld,
            consultations: next,
            total:
              typeof typedOld.total === 'number'
                ? Math.max(0, typedOld.total - 1)
                : typedOld.total,
          } as ConsultationSearchResult;
        },
      },
    ],
    mutationFn: (consultationId: string) =>
      api.deleteConsultation(consultationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consultationKeys.lists() });
    },
  });
};

// =============================================================================
// Lab Order
// =============================================================================

export const useCreateLabOrder = () => {
  const queryClient = useQueryClient();
  const { staff } = useAuth();

  return useBackgroundMutation({
    backgroundScope: 'order:lab:create',
    entityKey: ({ patientId }) => `patient:${patientId}`,
    maxRetries: 4,
    mutationFn: ({
      consultationId,
      patientId,
      visitId,
      order,
    }: {
      consultationId: string;
      patientId: string;
      visitId: string | null;
      order: LabOrderDTO;
    }) =>
      api.createLabOrder(
        consultationId,
        patientId,
        visitId,
        order,
        staff?.staff_id || '',
      ),
    onMutate: async ({ patientId, order }) => {
      await queryClient.cancelQueries({ queryKey: labMutationKeys.lists() });

      const previousLabSnapshots = queryClient.getQueriesData({
        queryKey: labMutationKeys.lists(),
      });

      const tempId = `temp-lab-${Date.now()}`;

      queryClient.setQueriesData(
        { queryKey: labMutationKeys.lists() },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;

          const optimistic = {
            request_id: tempId,
            patient_id: patientId,
            test_id: order.test_id,
            clinical_notes: order.clinical_notes || null,
            priority: order.priority || 'Normal',
            status: 'Pending',
            created_at: new Date().toISOString(),
            is_optimistic: true,
          };

          return [optimistic, ...old];
        },
      );

      return { previousLabSnapshots };
    },
    onError: (_err, _variables, context) => {
      if (!context?.previousLabSnapshots) return;

      for (const [queryKey, snapshot] of context.previousLabSnapshots) {
        queryClient.setQueryData(queryKey, snapshot);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab_requests'] });
      queryClient.invalidateQueries({ queryKey: labMutationKeys.all });
    },
  });
};

// =============================================================================
// Radiology Order
// =============================================================================

export const useCreateRadiologyOrder = () => {
  const queryClient = useQueryClient();
  const { staff } = useAuth();

  return useBackgroundMutation({
    backgroundScope: 'order:radiology:create',
    entityKey: ({ patientId }) => `patient:${patientId}`,
    maxRetries: 4,
    mutationFn: ({
      consultationId,
      patientId,
      visitId,
      order,
    }: {
      consultationId: string;
      patientId: string;
      visitId: string | null;
      order: RadiologyOrderDTO;
    }) =>
      api.createRadiologyOrder(
        consultationId,
        patientId,
        visitId,
        order,
        staff?.staff_id || '',
      ),
    onMutate: async ({ patientId, order }) => {
      await queryClient.cancelQueries({
        queryKey: radiologyMutationKeys.lists(),
      });

      const previousRadiologySnapshots = queryClient.getQueriesData({
        queryKey: radiologyMutationKeys.lists(),
      });

      const tempId = `temp-radiology-${Date.now()}`;

      queryClient.setQueriesData(
        { queryKey: radiologyMutationKeys.lists() },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;

          const optimistic = {
            request_id: tempId,
            patient_id: patientId,
            imaging_id: order.imaging_id,
            body_part: order.body_part || null,
            clinical_indication: order.clinical_indication || null,
            priority: order.priority || 'Normal',
            status: 'Pending',
            created_at: new Date().toISOString(),
            is_optimistic: true,
          };

          return [optimistic, ...old];
        },
      );

      return { previousRadiologySnapshots };
    },
    onError: (_err, _variables, context) => {
      if (!context?.previousRadiologySnapshots) return;

      for (const [queryKey, snapshot] of context.previousRadiologySnapshots) {
        queryClient.setQueryData(queryKey, snapshot);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radiology_requests'] });
      queryClient.invalidateQueries({ queryKey: radiologyMutationKeys.all });
    },
  });
};

// =============================================================================
// Prescription
// =============================================================================

export const useCreatePrescription = () => {
  const queryClient = useQueryClient();
  const { staff } = useAuth();

  return useBackgroundMutation({
    backgroundScope: 'order:prescription:create',
    entityKey: ({ patientId }) => `patient:${patientId}`,
    maxRetries: 4,
    mutationFn: ({
      consultationId,
      patientId,
      visitId,
      prescription,
    }: {
      consultationId: string;
      patientId: string;
      visitId: string | null;
      prescription: PrescriptionOrderDTO;
    }) =>
      api.createPrescription(
        consultationId,
        patientId,
        visitId,
        prescription,
        staff?.staff_id || '',
      ),
    onMutate: async ({ patientId, prescription }) => {
      await queryClient.cancelQueries({ queryKey: ['prescriptions'] });

      const previousPrescriptionSnapshots = queryClient.getQueriesData({
        queryKey: ['prescriptions'],
      });

      const tempId = `temp-prescription-${Date.now()}`;

      queryClient.setQueriesData(
        { queryKey: ['prescriptions'] },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;

          const optimistic = {
            prescription_id: tempId,
            patient_id: patientId,
            drug_id: prescription.drug_id,
            dosage: prescription.dosage,
            frequency: prescription.frequency,
            duration: prescription.duration || null,
            route: prescription.route,
            quantity_prescribed: prescription.quantity_prescribed,
            instructions: prescription.instructions || null,
            status: 'Pending',
            created_at: new Date().toISOString(),
            is_optimistic: true,
          };

          return [optimistic, ...old];
        },
      );

      return { previousPrescriptionSnapshots };
    },
    onError: (_err, _variables, context) => {
      if (!context?.previousPrescriptionSnapshots) return;

      for (const [
        queryKey,
        snapshot,
      ] of context.previousPrescriptionSnapshots) {
        queryClient.setQueryData(queryKey, snapshot);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    },
  });
};

// =============================================================================
// Catalogues
// =============================================================================

export const useLabTestCatalogue = () => {
  const { staff } = useAuth();
  return useQuery({
    queryKey: consultationKeys.catalogues.lab,
    queryFn: api.getLabTestCatalogue,
    staleTime: 1000 * 60 * 5, // 5 min — catalogues rarely change mid-session
    gcTime: 1000 * 60 * 30,   // 30 min cache retention
    enabled: !!staff?.staff_id,
  });
};

export const useImagingCatalogue = () => {
  const { staff } = useAuth();
  return useQuery({
    queryKey: consultationKeys.catalogues.imaging,
    queryFn: api.getImagingCatalogue,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    enabled: !!staff?.staff_id,
  });
};

export const useProcedureCatalogue = () => {
  const { staff } = useAuth();
  return useQuery({
    queryKey: consultationKeys.catalogues.procedures,
    queryFn: api.getProcedureCatalogue,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    enabled: !!staff?.staff_id,
  });
};

export const useDrugCatalogue = () => {
  const { staff } = useAuth();
  return useQuery({
    queryKey: consultationKeys.catalogues.drugs,
    queryFn: api.getDrugCatalogue,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    enabled: !!staff?.staff_id,
  });
};

export const useWardsCatalogue = () => {
  const { staff } = useAuth();
  return useQuery({
    queryKey: ['catalogues', 'wards'] as const,
    queryFn: api.getWardsCatalogue,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    enabled: !!staff?.staff_id,
  });
};

// =============================================================================
// Get My Patients (Doctor's Patient History)
// =============================================================================

export const useMyPatients = (params?: Omit<MyPatientsParams, 'doctorId'>) => {
  const { staff } = useAuth();
  const doctorId = staff?.staff_id || '';

  return useQuery({
    queryKey: consultationKeys.myPatients({ ...params, doctorId }),
    queryFn: () => api.getMyPatients({ ...params, doctorId }),
    enabled: !!doctorId,
    staleTime: 1000 * 60 * 2,
  });
};

// =============================================================================
// Get Patient Medical History - OPTIMIZED for fast loading
// =============================================================================

export const usePatientMedicalHistory = (patientId: string) => {
  return useQuery({
    queryKey: consultationKeys.patientHistory(patientId),
    queryFn: () => api.getPatientMedicalHistory(patientId),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh longer
    gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache longer (formerly cacheTime)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch if data exists
  });
};

/**
 * Subscribe to consultation changes for real-time updates
 */
export const useConsultationSubscription = () => {
  const queryClient = useQueryClient();
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleInvalidate = (keys: readonly (readonly unknown[])[]) => {
      if (invalidateTimerRef.current) {
        clearTimeout(invalidateTimerRef.current);
      }

      invalidateTimerRef.current = setTimeout(() => {
        for (const key of keys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
        invalidateTimerRef.current = null;
      }, 350);
    };

    const channel = supabase
      .channel('consultation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultations',
        },
        () => {
          scheduleInvalidate([consultationKeys.all, ['workflow']]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visits',
        },
        () => {
          scheduleInvalidate([
            consultationKeys.all,
            ['workflow'],
            ['myPatients'],
          ]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue',
        },
        () => {
          scheduleInvalidate([consultationKeys.all, ['queue']]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lab_requests',
        },
        () => {
          scheduleInvalidate([consultationKeys.all]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'radiology_requests',
        },
        () => {
          scheduleInvalidate([consultationKeys.all]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prescriptions',
        },
        () => {
          scheduleInvalidate([consultationKeys.all]);
        },
      )
      .subscribe();

    return () => {
      if (invalidateTimerRef.current) {
        clearTimeout(invalidateTimerRef.current);
        invalidateTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
