/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - MEDICAL RECORDS UTILITIES
 * Small utility functions for common operations
 * =============================================================================
 */

import type { StaffRow, AllergyInfo, AllergySeverity } from './types';

// =============================================================================
// Date Utilities
// =============================================================================

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): string {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();
  if (days < 0) {
    months--;
    const prev = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prev.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years === 0 && months === 0) {
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    if (weeks > 0 && rem > 0) return `${weeks}w ${rem}d`;
    if (weeks > 0) return `${weeks}w`;
    return `${days}d`;
  }
  if (years === 0) {
    const parts = [`${months}m`];
    if (days > 0) parts.push(`${days}d`);
    return parts.join(' ');
  }
  const parts = [`${years}y`];
  if (months > 0) parts.push(`${months}m`);
  if (days > 0) parts.push(`${days}d`);
  return parts.join(' ');
}

/**
 * Get ISO date string for a timeframe offset from today
 */
export function getTimeframeDate(timeframe: string): string | null {
  const now = new Date();
  switch (timeframe) {
    case '3m':
      now.setMonth(now.getMonth() - 3);
      return now.toISOString().split('T')[0];
    case '6m':
      now.setMonth(now.getMonth() - 6);
      return now.toISOString().split('T')[0];
    case '1y':
      now.setFullYear(now.getFullYear() - 1);
      return now.toISOString().split('T')[0];
    default:
      return null;
  }
}

// =============================================================================
// Name Formatting
// =============================================================================

/**
 * Normalize doctor name from staff row
 * Handles both single object and array formats from Supabase joins
 */
export function normalizeDoctorName(
  staff: StaffRow | StaffRow[] | null | undefined,
  prefix: string = 'Dr.',
): string | null {
  if (!staff) return null;

  const person = Array.isArray(staff) ? staff[0] : staff;
  if (!person?.first_name || !person?.last_name) return null;

  return `${prefix} ${person.first_name} ${person.last_name}`;
}

/**
 * Normalize staff name without title prefix
 */
export function normalizeStaffName(
  staff: StaffRow | StaffRow[] | null | undefined,
): string | null {
  if (!staff) return null;

  const person = Array.isArray(staff) ? staff[0] : staff;
  if (!person?.first_name || !person?.last_name) return null;

  return `${person.first_name} ${person.last_name}`;
}

// =============================================================================
// Diagnosis Parsing
// =============================================================================

/**
 * Parse diagnosis field to array of strings
 * Handles string, array, or text formats with delimiters
 */
export function parseDiagnosisToArray(
  diagnosis: string | string[] | null | undefined,
  diagnosisText?: string | null,
): string[] {
  if (Array.isArray(diagnosis)) {
    return diagnosis.filter(Boolean);
  }

  if (diagnosis) {
    return String(diagnosis)
      .split(/[,;]/)
      .map((d) => d.trim())
      .filter(Boolean);
  }

  if (diagnosisText) {
    return diagnosisText
      .split(/[,;]/)
      .map((d) => d.trim())
      .filter(Boolean);
  }

  return [];
}

/**
 * Convert diagnosis to string for display
 */
export function diagnosisToString(
  diagnosis: string | string[] | null | undefined,
  diagnosisText?: string | null,
): string {
  if (Array.isArray(diagnosis)) {
    return diagnosis.join(', ');
  }
  if (diagnosis) {
    return String(diagnosis);
  }
  if (diagnosisText) {
    return diagnosisText;
  }
  return '';
}

// =============================================================================
// JSON Utilities
// =============================================================================

/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse<T>(
  value: string | object | null | undefined,
  fallback: T,
): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Build a stable problem ID from diagnosis and date
 * Uses deterministic hash instead of Math.random()
 */
export function buildProblemIdStable(
  diagnosis: string,
  consultationDate: string,
  index: number,
): string {
  // Create a simple hash from the diagnosis string
  const normalized = diagnosis.toLowerCase().replace(/[^a-z0-9]/gi, '');
  const truncated = normalized.slice(0, 8) || 'unknown';

  // Use date and index for uniqueness instead of random
  const datePart = consultationDate.replace(/[^0-9]/g, '').slice(0, 8);

  return `prob-${index}-${truncated}-${datePart}`;
}

// =============================================================================
// Allergy Parsing
// =============================================================================

/**
 * Parse allergies array to AllergyInfo objects
 */
export function parseAllergies(
  allergiesArray: string[] | null | undefined,
): AllergyInfo[] {
  if (!allergiesArray || allergiesArray.length === 0) return [];

  return allergiesArray.map((allergen) => ({
    allergen,
    severity: 'Moderate' as AllergySeverity,
  }));
}

// =============================================================================
// Array Utilities
// =============================================================================

/**
 * Extract unique values from an array, filtering out nulls/undefined
 */
export function uniqueValues<T>(arr: (T | null | undefined)[]): T[] {
  return [...new Set(arr.filter((v): v is T => v != null))];
}

/**
 * Group array items by a key extractor function
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K | null | undefined,
): Map<K, T[]> {
  const map = new Map<K, T[]>();

  for (const item of items) {
    const key = keyFn(item);
    if (key == null) continue;

    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }

  return map;
}

/**
 * Create a lookup map from array
 */
export function toLookupMap<T, K extends string | number>(
  items: T[] | null | undefined,
  keyFn: (item: T) => K,
): Map<K, T> {
  const map = new Map<K, T>();
  if (!items) return map;

  for (const item of items) {
    map.set(keyFn(item), item);
  }

  return map;
}
