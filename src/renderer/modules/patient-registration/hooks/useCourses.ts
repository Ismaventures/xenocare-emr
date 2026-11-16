/**
 * =============================================================================
 * XENOCARE EMR - COURSES HOOKS
 * Description: React Query hooks for course management
 * =============================================================================
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  getCourses,
  getActiveCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  reactivateCourse,
  getNextCourseNumber,
  Course,
  CreateCourseDTO,
  UpdateCourseDTO,
} from '../api/courses.api';

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
    backgroundScope = 'courses:write',
    maxRetries = 4,
    ...restOptions
  } = options;

  return useBackgroundMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    backgroundScope,
    maxRetries,
  });
};

// Query keys
export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  list: (filters: { active?: boolean }) =>
    [...courseKeys.lists(), filters] as const,
  active: () => [...courseKeys.lists(), { active: true }] as const,
  detail: (id: string) => [...courseKeys.all, 'detail', id] as const,
  nextNumber: () => [...courseKeys.all, 'nextNumber'] as const,
};

/**
 * Hook to fetch all courses
 */
export function useCourses(onlyActive: boolean = false) {
  return useQuery({
    queryKey: courseKeys.list({ active: onlyActive }),
    queryFn: () => getCourses(onlyActive),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch only active courses (for dropdowns)
 */
export function useActiveCourses(enabled = true) {
  return useQuery({
    queryKey: courseKeys.active(),
    queryFn: getActiveCourses,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single course
 */
export function useCourse(id: string) {
  return useQuery({
    queryKey: courseKeys.detail(id),
    queryFn: () => getCourseById(id),
    enabled: !!id,
  });
}

/**
 * Hook to get the next course number
 */
export function useNextCourseNumber(enabled = true) {
  return useQuery({
    queryKey: courseKeys.nextNumber(),
    queryFn: getNextCourseNumber,
    enabled,
  });
}

/**
 * Hook to create a new course
 */
export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (course: CreateCourseDTO) => createCourse(course),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
    },
  });
}

/**
 * Hook to update a course
 */
export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (course: UpdateCourseDTO) => updateCourse(course),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
      queryClient.setQueryData(courseKeys.detail(data.id), data);
    },
  });
}

/**
 * Hook to delete (deactivate) a course
 */
export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
    },
  });
}

/**
 * Hook to reactivate a course
 */
export function useReactivateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reactivateCourse(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
      queryClient.setQueryData(courseKeys.detail(data.id), data);
    },
  });
}
