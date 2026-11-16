// =============================================================================
// OPD Classification Utilities - MOPD/SOPD Distinction
// =============================================================================
//
// Standard Hospital OPD Classification:
// - MOPD (Medical Out-Patient Department): General/Primary care, initial assessment
// - SOPD (Specialist Out-Patient Department): Specialty clinics, referred care
//
// This classification helps with:
// 1. Proper routing of patients between departments
// 2. Statistics and reporting
// 3. Resource allocation
// 4. Understanding patient flow patterns
// =============================================================================

import { supabase } from '../../api/supabaseClient';
import { OPDClassification } from './types';

export type DepartmentOPDType =
  | 'MOPD'
  | 'SOPD'
  | 'Support'
  | 'Diagnostic'
  | 'Administrative';

// =============================================================================
// Department Classification Mapping
// =============================================================================

/**
 * Default MOPD department patterns - General/Primary care
 */
export const MOPD_DEPARTMENT_PATTERNS = [
  'general',
  'family',
  'primary',
  'internal medicine',
  'general practice',
  'gopd',
  'medical opd',
];

/**
 * Default SOPD department patterns - Specialist care
 */
export const SOPD_DEPARTMENT_PATTERNS = [
  'surgery',
  'surgical',
  'cardio',
  'cardiac',
  'neuro',
  'ortho',
  'orthop',
  'pediatric',
  'paediatric',
  'gynae',
  'gynec',
  'obstetric',
  'ent',
  'ophth',
  'eye',
  'dermat',
  'skin',
  'psychiatr',
  'mental',
  'oncolog',
  'cancer',
  'urology',
  'nephro',
  'kidney',
  'gastro',
  'pulmon',
  'respiratory',
  'endocrin',
  'rheuma',
  'dental',
];

/**
 * Support department patterns - Not OPD
 */
export const SUPPORT_DEPARTMENT_PATTERNS = [
  'pharmacy',
  'nursing',
  'physiotherapy',
  'rehabilitation',
];

/**
 * Diagnostic department patterns - Not OPD
 */
export const DIAGNOSTIC_DEPARTMENT_PATTERNS = [
  'lab',
  'laboratory',
  'radiology',
  'imaging',
  'xray',
  'x-ray',
  'ultrasound',
  'scan',
  'pathology',
];

/**
 * Administrative department patterns - Not OPD
 */
export const ADMIN_DEPARTMENT_PATTERNS = [
  'admin',
  'billing',
  'records',
  'reception',
  'customer service',
  'hr',
  'human resource',
  'finance',
  'account',
];

// =============================================================================
// Classification Functions
// =============================================================================

/**
 * Determine OPD type based on department name
 */
export function classifyDepartmentByName(
  departmentName: string,
): DepartmentOPDType {
  const name = departmentName.toLowerCase();

  // Check MOPD patterns
  if (MOPD_DEPARTMENT_PATTERNS.some((pattern) => name.includes(pattern))) {
    return 'MOPD';
  }

  // Check SOPD patterns
  if (SOPD_DEPARTMENT_PATTERNS.some((pattern) => name.includes(pattern))) {
    return 'SOPD';
  }

  // Check Support patterns
  if (SUPPORT_DEPARTMENT_PATTERNS.some((pattern) => name.includes(pattern))) {
    return 'Support';
  }

  // Check Diagnostic patterns
  if (
    DIAGNOSTIC_DEPARTMENT_PATTERNS.some((pattern) => name.includes(pattern))
  ) {
    return 'Diagnostic';
  }

  // Check Administrative patterns
  if (ADMIN_DEPARTMENT_PATTERNS.some((pattern) => name.includes(pattern))) {
    return 'Administrative';
  }

  // Default to MOPD for unknown clinical departments
  return 'MOPD';
}

/**
 * Check if department is clinical OPD (MOPD or SOPD)
 */
export function isClinicalOPD(opdType: DepartmentOPDType | null): boolean {
  return opdType === 'MOPD' || opdType === 'SOPD';
}

/**
 * Get OPD classification for a visit based on department
 */
export async function getOPDClassificationForDepartment(
  departmentId: string,
): Promise<OPDClassification | null> {
  const { data: dept, error } = await supabase
    .from('departments')
    .select('opd_type, name')
    .eq('id', departmentId)
    .maybeSingle();

  if (error || !dept) return null;

  // Use stored opd_type if available
  if (dept.opd_type === 'MOPD' || dept.opd_type === 'SOPD') {
    return dept.opd_type as OPDClassification;
  }

  // Fall back to name-based classification
  const classified = classifyDepartmentByName(dept.name);
  if (classified === 'MOPD' || classified === 'SOPD') {
    return classified;
  }

  return null;
}

// =============================================================================
// Visit Classification
// =============================================================================

/**
 * Determine OPD classification for a new visit based on visit type and department
 */
export function determineOPDClassification(
  visitType: string,
  departmentOPDType?: DepartmentOPDType | null,
): OPDClassification {
  // If department type is explicitly set, use it
  if (departmentOPDType === 'MOPD' || departmentOPDType === 'SOPD') {
    return departmentOPDType;
  }

  // Visit type-based classification
  const type = visitType.toLowerCase();

  // Specialty visits are SOPD
  if (
    type.includes('specialty') ||
    type.includes('specialist') ||
    type.includes('referral')
  ) {
    return 'SOPD';
  }

  // Default to MOPD for general visits
  return 'MOPD';
}

// =============================================================================
// Statistics and Reporting
// =============================================================================

export interface OPDStatistics {
  date: string;
  mopd_count: number;
  sopd_count: number;
  total: number;
  mopd_percentage: number;
  sopd_percentage: number;
}

/**
 * Get OPD statistics for a date range
 */
export async function getOPDStatistics(
  startDate: string,
  endDate: string,
): Promise<OPDStatistics[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('created_at, opd_classification')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .not('opd_classification', 'is', null);

  if (error || !data) return [];

  // Group by date
  const byDate = new Map<string, { mopd: number; sopd: number }>();

  data.forEach((visit) => {
    const date = visit.created_at.split('T')[0];
    const current = byDate.get(date) || { mopd: 0, sopd: 0 };

    if (visit.opd_classification === 'MOPD') {
      current.mopd++;
    } else if (visit.opd_classification === 'SOPD') {
      current.sopd++;
    }

    byDate.set(date, current);
  });

  // Convert to array
  const stats: OPDStatistics[] = [];
  byDate.forEach((counts, date) => {
    const total = counts.mopd + counts.sopd;
    stats.push({
      date,
      mopd_count: counts.mopd,
      sopd_count: counts.sopd,
      total,
      mopd_percentage: total > 0 ? Math.round((counts.mopd / total) * 100) : 0,
      sopd_percentage: total > 0 ? Math.round((counts.sopd / total) * 100) : 0,
    });
  });

  return stats.sort((a, b) => a.date.localeCompare(b.date));
}

// =============================================================================
// Department Routing
// =============================================================================

export interface DepartmentForRouting {
  id: string;
  name: string;
  opd_type: DepartmentOPDType | null;
  is_active: boolean;
}

/**
 * Get MOPD departments for initial patient routing
 */
export async function getMOPDDepartments(): Promise<DepartmentForRouting[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('id, name, opd_type, is_active')
    .eq('opd_type', 'MOPD')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data as DepartmentForRouting[];
}

/**
 * Get SOPD departments for specialist referrals
 */
export async function getSOPDDepartments(): Promise<DepartmentForRouting[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('id, name, opd_type, is_active')
    .eq('opd_type', 'SOPD')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data as DepartmentForRouting[];
}

/**
 * Get all clinical OPD departments (both MOPD and SOPD)
 */
export async function getClinicalOPDDepartments(): Promise<
  DepartmentForRouting[]
> {
  const { data, error } = await supabase
    .from('departments')
    .select('id, name, opd_type, is_active')
    .in('opd_type', ['MOPD', 'SOPD'])
    .eq('is_active', true)
    .order('opd_type')
    .order('name');

  if (error) throw error;
  return data as DepartmentForRouting[];
}

// =============================================================================
// UI Helpers
// =============================================================================

/**
 * Get display label for OPD classification
 */
export function getOPDClassificationLabel(
  classification: OPDClassification,
): string {
  switch (classification) {
    case 'MOPD':
      return 'Medical OPD (General)';
    case 'SOPD':
      return 'Specialist OPD';
    default:
      return classification;
  }
}

/**
 * Get short label for OPD classification
 */
export function getOPDClassificationShortLabel(
  classification: OPDClassification,
): string {
  switch (classification) {
    case 'MOPD':
      return 'MOPD';
    case 'SOPD':
      return 'SOPD';
    default:
      return classification;
  }
}

/**
 * Get badge color for OPD classification
 */
export function getOPDClassificationColor(
  classification: OPDClassification,
): string {
  switch (classification) {
    case 'MOPD':
      return 'bg-blue-100 text-blue-800';
    case 'SOPD':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get department type badge color
 */
export function getDepartmentTypeColor(
  opdType: DepartmentOPDType | null,
): string {
  switch (opdType) {
    case 'MOPD':
      return 'bg-blue-100 text-blue-800';
    case 'SOPD':
      return 'bg-purple-100 text-purple-800';
    case 'Support':
      return 'bg-green-100 text-green-800';
    case 'Diagnostic':
      return 'bg-amber-100 text-amber-800';
    case 'Administrative':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
