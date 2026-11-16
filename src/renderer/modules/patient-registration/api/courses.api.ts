/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - COURSES API
 * Description: API functions for managing participant courses
 * =============================================================================
 */

import { supabase } from '../../../api/supabaseClient';

// =============================================================================
// TYPES
// =============================================================================

export interface Course {
  id: string;
  course_name: string;
  course_number: number;
  year: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  facility_id: string | null;
}

export interface CreateCourseDTO {
  course_name: string;
  course_number: number;
  year?: number;
  description?: string;
  is_active?: boolean;
  facility_id?: string;
}

export interface UpdateCourseDTO extends Partial<CreateCourseDTO> {
  id: string;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Get all courses
 */
export async function getCourses(
  onlyActive: boolean = false,
): Promise<Course[]> {
  let query = supabase
    .from('courses')
    .select('*')
    .order('course_number', { ascending: false });

  if (onlyActive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get active courses for dropdown
 */
export async function getActiveCourses(): Promise<Course[]> {
  return getCourses(true);
}

/**
 * Get a single course by ID
 */
export async function getCourseById(id: string): Promise<Course | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching course:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new course
 */
export async function createCourse(course: CreateCourseDTO): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .insert(course)
    .select()
    .single();

  if (error) {
    console.error('Error creating course:', error);
    throw error;
  }

  return data;
}

/**
 * Update a course
 */
export async function updateCourse(course: UpdateCourseDTO): Promise<Course> {
  const { id, ...updateData } = course;

  const { data, error } = await supabase
    .from('courses')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating course:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a course (soft delete by setting is_active to false)
 */
export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
}

/**
 * Reactivate a course
 */
export async function reactivateCourse(id: string): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error reactivating course:', error);
    throw error;
  }

  return data;
}

/**
 * Get the next course number (for auto-generating new courses)
 */
export async function getNextCourseNumber(): Promise<number> {
  const { data, error } = await supabase
    .from('courses')
    .select('course_number')
    .order('course_number', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error getting next course number:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return 34; // Start from Course 34 if no courses exist
  }

  return data[0].course_number + 1;
}
