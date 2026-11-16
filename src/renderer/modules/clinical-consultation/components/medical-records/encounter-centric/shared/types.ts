/**
 * Shared types for Encounter-Centric View
 */

export type ModuleType =
  | 'overview'
  | 'all-notes'
  | 'vitals'
  | 'treatment-plan'
  | 'labs'
  | 'radiology'
  | 'pharmacy'
  | 'procedures'
  | 'admissions'
  | 'billing'
  | 'care-team'
  | 'dental'
  | 'ophthalmology'
  | 'physiotherapy';

export interface ModuleConfig {
  id: ModuleType;
  label: string;
  icon: React.ElementType;
  description: string;
  restrictedTo?: string[]; // Roles that can access this module
}

export type FilterPeriod = 'week' | 'month' | 'year' | 'all' | 'custom';

export interface CustomDateRange {
  startDate: string;
  endDate: string;
}
