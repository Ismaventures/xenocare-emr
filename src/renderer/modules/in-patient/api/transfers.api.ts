// =============================================================================
// NDC MEDICAL CENTRE EMR - Bed Transfers API
// Supabase API functions for patient bed/ward transfers
// =============================================================================

import { supabase } from '../../../api/supabaseClient';
import type {
  BedTransfer,
  CreateBedTransferDTO,
  TransferReason,
} from '../../../types/database.types';

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get transfer history for an admission
 */
export async function getTransferHistory(admissionId: string) {
  const { data, error } = await supabase
    .from('bed_transfers')
    .select(
      `
      *,
      from_ward:wards!bed_transfers_from_ward_id_fkey(id, name, ward_type),
      from_bed:beds!bed_transfers_from_bed_id_fkey(id, bed_number),
      to_ward:wards!bed_transfers_to_ward_id_fkey(id, name, ward_type),
      to_bed:beds!bed_transfers_to_bed_id_fkey(id, bed_number),
      authorized_by_user:staff!bed_transfers_authorized_by_fkey(id, first_name, last_name),
      performed_by_user:staff!bed_transfers_performed_by_fkey(id, first_name, last_name)
    `,
    )
    .eq('admission_id', admissionId)
    .order('transfer_date', { ascending: false });

  if (error) throw error;
  return data as BedTransfer[];
}

/**
 * Get a single transfer by ID
 */
export async function getTransferById(transferId: string) {
  const { data, error } = await supabase
    .from('bed_transfers')
    .select(
      `
      *,
      from_ward:wards!bed_transfers_from_ward_id_fkey(id, name, ward_type),
      from_bed:beds!bed_transfers_from_bed_id_fkey(id, bed_number),
      to_ward:wards!bed_transfers_to_ward_id_fkey(id, name, ward_type),
      to_bed:beds!bed_transfers_to_bed_id_fkey(id, bed_number),
      admission:admissions(
        id,
        admission_number,
        patient:patients(id, first_name, surname, emr_number)
      )
    `,
    )
    .eq('id', transferId)
    .single();

  if (error) throw error;
  return data as BedTransfer;
}

/**
 * Get transfers by ward (incoming or outgoing)
 */
export async function getTransfersByWard(
  wardId: string,
  direction: 'incoming' | 'outgoing',
  startDate?: string,
  endDate?: string,
) {
  const wardField = direction === 'incoming' ? 'to_ward_id' : 'from_ward_id';

  let query = supabase
    .from('bed_transfers')
    .select(
      `
      *,
      from_ward:wards!bed_transfers_from_ward_id_fkey(id, name),
      to_ward:wards!bed_transfers_to_ward_id_fkey(id, name),
      from_bed:beds!bed_transfers_from_bed_id_fkey(id, bed_number),
      to_bed:beds!bed_transfers_to_bed_id_fkey(id, bed_number),
      admission:admissions(
        id,
        patient:patients(id, first_name, surname, emr_number)
      )
    `,
    )
    .eq(wardField, wardId)
    .order('transfer_date', { ascending: false });

  if (startDate) {
    query = query.gte('transfer_date', startDate);
  }
  if (endDate) {
    query = query.lte('transfer_date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as BedTransfer[];
}

/**
 * Get today's transfers for a facility
 */
export async function getTodaysTransfers(facilityId: string) {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('bed_transfers')
    .select(
      `
      *,
      from_ward:wards!bed_transfers_from_ward_id_fkey(id, name),
      to_ward:wards!bed_transfers_to_ward_id_fkey(id, name),
      from_bed:beds!bed_transfers_from_bed_id_fkey(id, bed_number),
      to_bed:beds!bed_transfers_to_bed_id_fkey(id, bed_number),
      admission:admissions!inner(
        id,
        admission_number,
        facility_id,
        patient:patients(id, first_name, surname, emr_number)
      )
    `,
    )
    .eq('admission.facility_id', facilityId)
    .gte('transfer_date', today)
    .order('transfer_date', { ascending: false });

  if (error) throw error;
  return data as BedTransfer[];
}

/**
 * Get transfers by reason
 */
export async function getTransfersByReason(
  facilityId: string,
  reason: TransferReason,
  startDate?: string,
  endDate?: string,
) {
  let query = supabase
    .from('bed_transfers')
    .select(
      `
      *,
      from_ward:wards!bed_transfers_from_ward_id_fkey(id, name),
      to_ward:wards!bed_transfers_to_ward_id_fkey(id, name),
      admission:admissions!inner(
        id,
        facility_id,
        patient:patients(id, first_name, surname)
      )
    `,
    )
    .eq('admission.facility_id', facilityId)
    .eq('transfer_reason', reason)
    .order('transfer_date', { ascending: false });

  if (startDate) {
    query = query.gte('transfer_date', startDate);
  }
  if (endDate) {
    query = query.lte('transfer_date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as BedTransfer[];
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a bed transfer
 */
export async function createBedTransfer(
  transferData: CreateBedTransferDTO,
  userId: string,
) {
  // First get current admission details to populate from_ward and from_bed
  const { data: admission, error: admissionError } = await supabase
    .from('admissions')
    .select('current_ward_id, current_bed_id, admission_status')
    .eq('id', transferData.admission_id)
    .single();

  if (admissionError) throw admissionError;

  // Create the transfer record
  const { data: transfer, error: transferError } = await supabase
    .from('bed_transfers')
    .insert({
      admission_id: transferData.admission_id,
      from_ward_id: admission.current_ward_id,
      from_bed_id: admission.current_bed_id,
      to_ward_id: transferData.to_ward_id,
      to_bed_id: transferData.to_bed_id,
      transfer_date: new Date().toISOString(),
      transfer_reason: transferData.transfer_reason,
      transfer_reason_details: transferData.transfer_reason_details,
      clinical_status_at_transfer:
        transferData.clinical_status_at_transfer || admission.admission_status,
      authorized_by: userId,
      performed_by: userId,
      notes: transferData.notes,
      created_by: userId,
    })
    .select(
      `
      *,
      from_ward:wards!bed_transfers_from_ward_id_fkey(id, name),
      to_ward:wards!bed_transfers_to_ward_id_fkey(id, name),
      from_bed:beds!bed_transfers_from_bed_id_fkey(id, bed_number),
      to_bed:beds!bed_transfers_to_bed_id_fkey(id, bed_number)
    `,
    )
    .single();

  if (transferError) throw transferError;

  // Update admission with new ward and bed
  // Note: The database trigger will handle bed status updates
  const { error: updateError } = await supabase
    .from('admissions')
    .update({
      current_ward_id: transferData.to_ward_id,
      current_bed_id: transferData.to_bed_id,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', transferData.admission_id);

  if (updateError) throw updateError;

  return transfer as BedTransfer;
}

/**
 * Update transfer notes
 */
export async function updateTransferNotes(transferId: string, notes: string) {
  const { data, error } = await supabase
    .from('bed_transfers')
    .update({ notes })
    .eq('id', transferId)
    .select()
    .single();

  if (error) throw error;
  return data as BedTransfer;
}

/**
 * Get pending transfers for a facility (status = pending, not yet performed)
 */
export async function getPendingTransfers(facilityId: string) {
  const { data, error } = await supabase
    .from('bed_transfers')
    .select(
      `
      *,
      from_ward:wards!bed_transfers_from_ward_id_fkey(id, name),
      to_ward:wards!bed_transfers_to_ward_id_fkey(id, name),
      from_bed:beds!bed_transfers_from_bed_id_fkey(id, bed_number),
      to_bed:beds!bed_transfers_to_bed_id_fkey(id, bed_number),
      admission:admissions!inner(
        id,
        admission_number,
        facility_id,
        patient:patients(id, first_name, surname, emr_number)
      )
    `,
    )
    .eq('admission.facility_id', facilityId)
    .is('performed_by', null)
    .order('transfer_date', { ascending: false });

  if (error) throw error;
  return data as BedTransfer[];
}

/**
 * Cancel a pending transfer
 */
export async function cancelPendingTransfer(
  transferId: string,
  reason: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from('bed_transfers')
    .update({
      notes: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transferId)
    .is('performed_by', null) // Only cancel if not yet performed
    .select()
    .single();

  if (error) throw error;

  // Also delete the transfer if not performed
  const { error: deleteError } = await supabase
    .from('bed_transfers')
    .delete()
    .eq('id', transferId)
    .is('performed_by', null);

  if (deleteError) throw deleteError;

  return data as BedTransfer;
}

/**
 * Get transfer statistics for a facility
 */
export async function getTransferStatistics(
  facilityId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase
    .from('bed_transfers')
    .select(
      `
      transfer_reason,
      to_ward:wards!bed_transfers_to_ward_id_fkey(ward_type),
      admission:admissions!inner(facility_id)
    `,
    )
    .eq('admission.facility_id', facilityId)
    .gte('transfer_date', startDate)
    .lte('transfer_date', endDate);

  if (error) throw error;

  // Aggregate statistics
  const reasonCounts: Record<string, number> = {};
  const wardTypeCounts: Record<string, number> = {};

  data.forEach((transfer) => {
    // Count by reason
    reasonCounts[transfer.transfer_reason] =
      (reasonCounts[transfer.transfer_reason] || 0) + 1;

    // Count by destination ward type - handle Supabase single relation response
    const toWard = transfer.to_ward as unknown as { ward_type: string } | null;
    if (toWard?.ward_type) {
      wardTypeCounts[toWard.ward_type] =
        (wardTypeCounts[toWard.ward_type] || 0) + 1;
    }
  });

  return {
    totalTransfers: data.length,
    byReason: reasonCounts,
    byWardType: wardTypeCounts,
  };
}

/**
 * Transfer a patient (wrapper for createBedTransfer)
 */
export async function transferPatient(
  data: {
    admission_id: string;
    from_ward_id: string;
    from_bed_id: string;
    to_ward_id: string;
    to_bed_id: string;
    reason: TransferReason;
    notes?: string;
  },
  userId: string,
) {
  return createBedTransfer(
    {
      admission_id: data.admission_id,
      to_ward_id: data.to_ward_id,
      to_bed_id: data.to_bed_id,
      transfer_reason: data.reason,
      notes: data.notes,
    },
    userId,
  );
}
