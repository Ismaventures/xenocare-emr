import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  customerServiceApi,
  FeedbackFilters,
  AppointmentFilters,
} from '../api/customer-service.api';
import {
  CreateAppointmentDTO,
  CreateFeedbackDTO,
  UpdateAppointmentDTO,
  UpdateFeedbackDTO,
} from '../dtos/customer-service.dto';
import { useAuth } from '../../../contexts/AuthContext';

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
    backgroundScope = 'customer-service:write',
    maxRetries = 4,
    ...restOptions
  } = options;

  return useBackgroundMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    backgroundScope,
    maxRetries,
  });
};

export const customerServiceKeys = {
  all: ['customer-service'] as const,
  feedback: (filters: FeedbackFilters) =>
    [...customerServiceKeys.all, 'feedback', filters] as const,
  appointments: (filters: AppointmentFilters) =>
    [...customerServiceKeys.all, 'appointments', filters] as const,
  doctors: () => [...customerServiceKeys.all, 'doctors'] as const,
};

export function useFeedback(filters: FeedbackFilters = {}) {
  return useQuery({
    queryKey: customerServiceKeys.feedback(filters),
    queryFn: () => customerServiceApi.getFeedback(filters),
  });
}

export function useAppointments(filters: AppointmentFilters = {}) {
  return useQuery({
    queryKey: customerServiceKeys.appointments(filters),
    queryFn: () => customerServiceApi.getAppointments(filters),
  });
}

export function useDoctors() {
  return useQuery({
    queryKey: customerServiceKeys.doctors(),
    queryFn: () => customerServiceApi.getDoctors(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFeedbackDTO) =>
      customerServiceApi.createFeedback(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerServiceKeys.all });
    },
  });
}

export function useUpdateFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      feedbackId,
      payload,
    }: {
      feedbackId: string;
      payload: UpdateFeedbackDTO;
    }) => customerServiceApi.updateFeedback(feedbackId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerServiceKeys.all });
    },
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  const { staff } = useAuth();

  return useMutation({
    mutationFn: (payload: CreateAppointmentDTO) =>
      customerServiceApi.createAppointment(payload, staff?.staff_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerServiceKeys.all });
    },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      payload,
    }: {
      appointmentId: string;
      payload: UpdateAppointmentDTO;
    }) => customerServiceApi.updateAppointment(appointmentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerServiceKeys.all });
    },
  });
}
