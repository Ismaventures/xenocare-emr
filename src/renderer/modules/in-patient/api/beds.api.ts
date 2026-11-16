// =============================================================================
// XENOCARE EMR - Beds API
// Supabase API functions for bed management
// =============================================================================

import { supabase } from '../../../api/supabaseClient';
import type {
  Bed,
  BedType,
  BedStatus,
  BedAvailabilityView,
} from '../../../types/database.types';

function normalizeBedStatus(status: unknown): string {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '_');
}

function isAvailableBedStatus(status: unknown): boolean {
  const normalized = normalizeBedStatus(status);
  return (
    normalized === 'available' ||
    normalized === 'vacant' ||
    normalized === 'free'
  );
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all beds in a ward
 */
export async function getBedsByWard(wardId: string) {
  const { data, error } = await supabase
    .from('beds')
    .select(
      `
      *,
      ward:wards(id, name, ward_type),
      current_patient:patients(id, first_name, surname, emr_number)
    `,
    )
    .eq('ward_id', wardId)
    .eq('is_active', true)
    .order('bed_number');

  if (error) throw error;
  return data as Bed[];
}

/**
 * Get a single bed by ID
 */
export async function getBedById(bedId: string) {
  const { data, error } = await supabase
    .from('beds')
    .select(
      `
      *,
      ward:wards(id, name, ward_type, nurse_station_phone),
      current_patient:patients(id, first_name, surname, emr_number, date_of_birth, gender)
    `,
    )
    .eq('id', bedId)
    .single();

  if (error) throw error;
  return data as Bed;
}

/**
 * Get available beds in a ward
 * Note: Uses ilike for case-insensitive status check since some beds may have
 * 'available' (lowercase) instead of 'Available' (PascalCase)
 */
export async function getAvailableBedsByWard(wardId: string) {
  const { data, error } = await supabase
    .from('beds')
    .select('*')
    .eq('ward_id', wardId)
    .order('bed_number');

  if (error) throw error;
  return (data || []).filter((bed: any) => {
    const isActive = bed?.is_active !== false;
    return isActive && isAvailableBedStatus(bed?.status);
  }) as Bed[];
}

/**
 * Get available beds across all wards in a facility
 * Note: Uses ilike for case-insensitive status check
 */
export async function getAvailableBedsInFacility(facilityId: string) {
  const { data, error } = await supabase
    .from('bed_availability')
    .select('*')
    .eq('facility_id', facilityId);

  if (error) throw error;
  return (data || []).filter((bed: any) => {
    const isActive = bed?.is_active !== false;
    return isActive && isAvailableBedStatus(bed?.status);
  }) as BedAvailabilityView[];
}

/**
 * Get bed availability view for a facility
 */
export async function getBedAvailability(facilityId: string) {
  const { data, error } = await supabase
    .from('bed_availability')
    .select('*')
    .eq('facility_id', facilityId);

  if (error) throw error;
  return data as BedAvailabilityView[];
}

/**
 * Get beds by status
 */
export async function getBedsByStatus(wardId: string, status: BedStatus) {
  const { data, error } = await supabase
    .from('beds')
    .select(
      `
      *,
      current_patient:patients(id, first_name, surname, emr_number)
    `,
    )
    .eq('ward_id', wardId)
    .eq('status', status)
    .eq('is_active', true)
    .order('bed_number');

  if (error) throw error;
  return data as Bed[];
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new bed
 */
export async function createBed(bedData: {
  ward_id: string;
  bed_number: string;
  bed_type: BedType;
  features?: string[];
  daily_rate?: number;
  location_details?: string;
}) {
  const { data, error } = await supabase
    .from('beds')
    .insert({
      ...bedData,
      status: 'Available',
      features: bedData.features || [],
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Bed;
}

/**
 * Create multiple beds at once
 */
export async function createBulkBeds(
  wardId: string,
  bedType: BedType,
  startNumber: number,
  count: number,
  prefix: string = '',
  dailyRate?: number,
) {
  const beds = Array.from({ length: count }, (_, i) => ({
    ward_id: wardId,
    bed_number: `${prefix}${startNumber + i}`,
    bed_type: bedType,
    status: 'Available' as BedStatus,
    daily_rate: dailyRate,
    features: [],
    is_active: true,
  }));

  const { data, error } = await supabase.from('beds').insert(beds).select();

  if (error) throw error;
  return data as Bed[];
}

/**
 * Update a bed
 */
export async function updateBed(
  bedId: string,
  updates: Partial<Omit<Bed, 'id' | 'created_at' | 'ward_id'>>,
) {
  const { data, error } = await supabase
    .from('beds')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bedId)
    .select()
    .single();

  if (error) throw error;
  return data as Bed;
}

/**
 * Update bed status
 */
export async function updateBedStatus(bedId: string, status: BedStatus) {
  const updates: Partial<Bed> = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Clear patient info if bed is becoming available
  if (status === 'Available') {
    updates.current_patient_id = null;
    updates.current_admission_id = null;
  }

  // Set cleaning timestamp if bed is being cleaned
  if (status === 'Cleaning') {
    updates.last_cleaned_at = new Date().toISOString();
  }

  // Set maintenance timestamp if bed is under maintenance
  if (status === 'Maintenance') {
    updates.last_maintenance_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('beds')
    .update(updates)
    .eq('id', bedId)
    .select()
    .single();

  if (error) throw error;
  return data as Bed;
}

/**
 * Reserve a bed for a patient
 */
export async function reserveBed(bedId: string, patientId: string) {
  const { data, error } = await supabase
    .from('beds')
    .update({
      status: 'Reserved',
      current_patient_id: patientId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bedId)
    .eq('status', 'Available') // Only reserve if currently available
    .select()
    .single();

  if (error) throw error;
  return data as Bed;
}

/**
 * Deactivate a bed (soft delete)
 */
export async function deactivateBed(bedId: string) {
  // First check if bed is occupied
  const { data: bed } = await supabase
    .from('beds')
    .select('status')
    .eq('id', bedId)
    .single();

  if (bed?.status === 'Occupied') {
    throw new Error('Cannot deactivate an occupied bed');
  }

  const { error } = await supabase
    .from('beds')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bedId);

  if (error) throw error;
}

/**
 * Get bed occupancy statistics for a ward
 */
export async function getBedOccupancyStats(wardId: string) {
  const { data, error } = await supabase
    .from('beds')
    .select('status')
    .eq('ward_id', wardId)
    .eq('is_active', true);

  if (error) throw error;

  const stats = {
    total: data.length,
    Available: 0,
    Occupied: 0,
    Reserved: 0,
    Maintenance: 0,
    Cleaning: 0,
  };

  data.forEach((bed) => {
    if (bed.status in stats) {
      stats[bed.status as keyof typeof stats]++;
    }
  });

  return {
    ...stats,
    occupancyRate:
      stats.total > 0 ? Math.round((stats.Occupied / stats.total) * 100) : 0,
  };
}
