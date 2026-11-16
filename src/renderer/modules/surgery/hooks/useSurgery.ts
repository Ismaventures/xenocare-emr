/**
 * Surgery/Theatre Module API Hooks
 * Encounter-centric surgery workflow management with NHIS integration
 */

import { useCallback, useState, useEffect } from 'react';
import { supabase } from '../../../api/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Surgery,
  SurgeryFormData,
  SurgeryWithDetails,
  SurgeryStatus,
  SurgeryListFilters,
  SurgeryDashboardStats,
  SurgeryConsentData,
  SurgeryIntraOpData,
  SurgeryPostOpData,
  SafeSurgeryChecklist,
  TheatreRoom,
  TheatreRoomFormData,
  TheatreRoomStatus,
  TheatreSchedule,
  TheatreScheduleFormData,
  TheatreScheduleWithDetails,
  TheatreScheduleFilters,
  TheatreUtilization,
  SurgeryPreopAssessment,
  PreopAssessmentFormData,
  SurgeryAnesthesiaRecord,
  AnesthesiaRecordFormData,
  SurgeryConsumable,
  SurgeryConsumableFormData,
} from '../types/surgery.types';

// ============================================================================
// SURGERY HOOKS
// ============================================================================

/**
 * Hook for surgery CRUD operations
 */
export function useSurgeries() {
  const { staff } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surgeries, setSurgeries] = useState<SurgeryWithDetails[]>([]);

  /**
   * Create a new surgery record
   */
  const createSurgery = useCallback(
    async (
      encounterId: string,
      patientId: string,
      data: SurgeryFormData,
      admissionId?: string,
    ): Promise<Surgery | null> => {
      if (!staff) {
        setError('No facility or user context');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: surgery, error: createError } = await supabase
          .from('surgeries')
          .insert({
            encounter_id: encounterId,
            patient_id: patientId,
            admission_id: admissionId || null,
            facility_id: staff.facility_id,
            ...data,
            created_by: staff.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        return surgery;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create surgery';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get surgery by ID with full details
   */
  const getSurgeryById = useCallback(
    async (surgeryId: string): Promise<SurgeryWithDetails | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('surgeries')
          .select(
            `
            *,
            patients:patient_id(first_name, surname, emr_number, insurance_type),
            surgeon:primary_surgeon_id(first_name, last_name),
            anesthetist:anesthetist_id(first_name, last_name),
            theatre_rooms:theatre_room_id(room_name, room_code)
          `,
          )
          .eq('id', surgeryId)
          .single();

        if (fetchError) throw fetchError;

        if (data) {
          return {
            ...data,
            patient_name: `${data.patients?.first_name} ${data.patients?.surname}`,
            patient_emr_number: data.patients?.emr_number,
            patient_insurance_type: data.patients?.insurance_type,
            surgeon_name: data.surgeon
              ? `${data.surgeon.first_name} ${data.surgeon.last_name}`
              : undefined,
            anesthetist_name: data.anesthetist
              ? `${data.anesthetist.first_name} ${data.anesthetist.last_name}`
              : undefined,
            theatre_room_name: data.theatre_rooms?.room_name,
          };
        }
        return null;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch surgery';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * List surgeries with filters
   */
  const listSurgeries = useCallback(
    async (filters: SurgeryListFilters = {}): Promise<SurgeryWithDetails[]> => {
      if (!staff) return [];

      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('surgeries')
          .select(
            `
            *,
            patients:patient_id(first_name, surname, emr_number, insurance_type),
            surgeon:primary_surgeon_id(first_name, last_name),
            anesthetist:anesthetist_id(first_name, last_name)
          `,
          )
          .eq('facility_id', staff.facility_id)
          .order('scheduled_date', { ascending: true })
          .order('scheduled_time', { ascending: true });

        // Apply filters
        if (filters.status?.length) {
          query = query.in('status', filters.status);
        }
        if (filters.priority?.length) {
          query = query.in('priority', filters.priority);
        }
        if (filters.scheduled_date_from) {
          query = query.gte('scheduled_date', filters.scheduled_date_from);
        }
        if (filters.scheduled_date_to) {
          query = query.lte('scheduled_date', filters.scheduled_date_to);
        }
        if (filters.surgeon_id) {
          query = query.eq('primary_surgeon_id', filters.surgeon_id);
        }
        if (filters.theatre_room_id) {
          query = query.eq('theatre_room_id', filters.theatre_room_id);
        }
        if (filters.requires_nhis_approval !== undefined) {
          query = query.eq(
            'requires_nhis_approval',
            filters.requires_nhis_approval,
          );
        }
        if (filters.is_locked !== undefined) {
          query = query.eq('is_locked', filters.is_locked);
        }
        if (filters.search) {
          query = query.or(
            `surgery_number.ilike.%${filters.search}%,primary_procedure.ilike.%${filters.search}%`,
          );
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        return (data || []).map((surgery) => ({
          ...surgery,
          patient_name: `${surgery.patients?.first_name} ${surgery.patients?.surname}`,
          patient_emr_number: surgery.patients?.emr_number,
          patient_insurance_type: surgery.patients?.insurance_type,
          surgeon_name: surgery.surgeon
            ? `${surgery.surgeon.first_name} ${surgery.surgeon.last_name}`
            : undefined,
          anesthetist_name: surgery.anesthetist
            ? `${surgery.anesthetist.first_name} ${surgery.anesthetist.last_name}`
            : undefined,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch surgeries';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get surgeries for a specific encounter
   */
  const getSurgeriesByEncounter = useCallback(
    async (encounterId: string): Promise<SurgeryWithDetails[]> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('surgeries')
          .select(
            `
            *,
            patients:patient_id(first_name, surname, emr_number),
            surgeon:primary_surgeon_id(first_name, last_name)
          `,
          )
          .eq('encounter_id', encounterId)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        return (data || []).map((surgery) => ({
          ...surgery,
          patient_name: `${surgery.patients?.first_name} ${surgery.patients?.surname}`,
          patient_emr_number: surgery.patients?.emr_number,
          surgeon_name: surgery.surgeon
            ? `${surgery.surgeon.first_name} ${surgery.surgeon.last_name}`
            : undefined,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch surgeries';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Update surgery status with validation
   */
  const updateSurgeryStatus = useCallback(
    async (
      surgeryId: string,
      newStatus: SurgeryStatus,
      additionalData?: Partial<Surgery>,
    ): Promise<boolean> => {
      if (!staff) {
        setError('No user context');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        // Auto-set timestamps based on status
        const timestampUpdates: Partial<Surgery> = {};
        const now = new Date().toISOString();

        switch (newStatus) {
          case 'In_Theatre':
            timestampUpdates.theatre_entry_time = now;
            break;
          case 'Recovery':
            timestampUpdates.theatre_exit_time = now;
            timestampUpdates.recovery_start_time = now;
            break;
          case 'Completed':
            timestampUpdates.recovery_end_time = now;
            break;
          case 'Cancelled':
            timestampUpdates.cancelled_at = now;
            timestampUpdates.cancelled_by = staff.id;
            break;
        }

        const { error: updateError } = await supabase
          .from('surgeries')
          .update({
            status: newStatus,
            ...timestampUpdates,
            ...additionalData,
            updated_by: staff.id,
            updated_at: now,
          })
          .eq('id', surgeryId)
          .eq('is_locked', false); // Can only update non-locked surgeries

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to update surgery status';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Record consent for surgery
   */
  const recordConsent = useCallback(
    async (
      surgeryId: string,
      consent: SurgeryConsentData,
    ): Promise<boolean> => {
      if (!staff) {
        setError('No user context');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('surgeries')
          .update({
            consent_obtained: consent.consent_obtained,
            consent_type: consent.consent_type,
            consent_date: consent.consent_date,
            consent_obtained_by: consent.consent_obtained_by,
            consent_witness_id: consent.consent_witness_id,
            consent_document_url: consent.consent_document_url,
            consent_notes: consent.consent_notes,
            updated_by: staff.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', surgeryId);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to record consent';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Update WHO Safe Surgery Checklist
   */
  const updateChecklist = useCallback(
    async (
      surgeryId: string,
      checklist: SafeSurgeryChecklist,
      completed: boolean,
    ): Promise<boolean> => {
      if (!staff) {
        setError('No user context');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('surgeries')
          .update({
            preop_checklist: checklist,
            preop_checklist_completed: completed,
            preop_checklist_completed_at: completed
              ? new Date().toISOString()
              : null,
            preop_checklist_completed_by: completed ? staff.id : null,
            updated_by: staff.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', surgeryId);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update checklist';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Document intra-operative details
   */
  const documentIntraOp = useCallback(
    async (surgeryId: string, data: SurgeryIntraOpData): Promise<boolean> => {
      if (!staff) {
        setError('No user context');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('surgeries')
          .update({
            ...data,
            updated_by: staff.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', surgeryId)
          .eq('is_locked', false);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to document intra-op';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Document post-operative details
   */
  const documentPostOp = useCallback(
    async (surgeryId: string, data: SurgeryPostOpData): Promise<boolean> => {
      if (!staff) {
        setError('No user context');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('surgeries')
          .update({
            ...data,
            updated_by: staff.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', surgeryId)
          .eq('is_locked', false);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to document post-op';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Sign-off surgery (locks after all signatures)
   */
  const signOffSurgery = useCallback(
    async (
      surgeryId: string,
      signOffType: 'surgeon' | 'anesthetist' | 'nurse',
    ): Promise<boolean> => {
      if (!staff) {
        setError('No user context');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const updates: Partial<Surgery> = {
          updated_by: staff.id,
          updated_at: new Date().toISOString(),
        };

        switch (signOffType) {
          case 'surgeon':
            updates.surgeon_signoff_by = staff.id;
            updates.surgeon_signoff_at = new Date().toISOString();
            break;
          case 'anesthetist':
            updates.anesthetist_signoff_by = staff.id;
            updates.anesthetist_signoff_at = new Date().toISOString();
            break;
          case 'nurse':
            updates.nurse_signoff_by = staff.id;
            updates.nurse_signoff_at = new Date().toISOString();
            break;
        }

        const { error: updateError } = await supabase
          .from('surgeries')
          .update(updates)
          .eq('id', surgeryId)
          .eq('is_locked', false);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to sign-off';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get surgery dashboard statistics
   */
  const getDashboardStats =
    useCallback(async (): Promise<SurgeryDashboardStats | null> => {
      if (!staff) return null;

      setLoading(true);
      setError(null);

      try {
        const today = new Date().toISOString().split('T')[0];

        const { data, error: fetchError } = await supabase
          .from('surgeries')
          .select(
            'id, status, priority, consent_obtained, preop_checklist_completed, requires_nhis_approval, nhis_authorization_code, scheduled_date',
          )
          .eq('facility_id', staff.facility_id);

        if (fetchError) throw fetchError;

        const todaySurgeries = (data || []).filter(
          (s) => s.scheduled_date === today,
        );
        const allSurgeries = data || [];

        return {
          today_scheduled: todaySurgeries.length,
          today_completed: todaySurgeries.filter(
            (s) => s.status === 'Completed',
          ).length,
          today_in_progress: todaySurgeries.filter(
            (s) => s.status === 'In_Theatre',
          ).length,
          pending_consent: allSurgeries.filter(
            (s) => s.status === 'Planned' && !s.consent_obtained,
          ).length,
          pending_preop: allSurgeries.filter(
            (s) => s.status === 'Planned' && !s.preop_checklist_completed,
          ).length,
          awaiting_nhis: allSurgeries.filter(
            (s) => s.requires_nhis_approval && !s.nhis_authorization_code,
          ).length,
          emergency_pending: allSurgeries.filter(
            (s) => s.priority === 'Emergency' && s.status === 'Planned',
          ).length,
          cancelled_today: todaySurgeries.filter(
            (s) => s.status === 'Cancelled',
          ).length,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch stats';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    }, []);

  return {
    loading,
    error,
    createSurgery,
    getSurgeryById,
    listSurgeries,
    getSurgeriesByEncounter,
    updateSurgeryStatus,
    recordConsent,
    updateChecklist,
    documentIntraOp,
    documentPostOp,
    signOffSurgery,
    getDashboardStats,
  };
}

// ============================================================================
// THEATRE ROOMS HOOKS
// ============================================================================

/**
 * Hook for theatre room management
 */
export function useTheatreRooms() {
  const { staff } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * List all theatre rooms for facility
   */
  const listTheatreRooms = useCallback(
    async (activeOnly = true): Promise<TheatreRoom[]> => {
      if (!staff) return [];

      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('theatre_rooms')
          .select('*')
          .eq('facility_id', staff.facility_id)
          .order('room_code');

        if (activeOnly) {
          query = query.eq('is_active', true);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        return data || [];
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch theatre rooms';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Create a new theatre room
   */
  const createTheatreRoom = useCallback(
    async (data: TheatreRoomFormData): Promise<TheatreRoom | null> => {
      if (!staff) {
        setError('No facility or user context');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: room, error: createError } = await supabase
          .from('theatre_rooms')
          .insert({
            facility_id: staff.facility_id,
            ...data,
            created_by: staff.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        return room;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create theatre room';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Update theatre room status
   */
  const updateRoomStatus = useCallback(
    async (roomId: string, status: TheatreRoomStatus): Promise<boolean> => {
      if (!staff) {
        setError('No user context');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('theatre_rooms')
          .update({
            current_status: status,
            updated_by: staff.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', roomId);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update room status';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get room utilization stats
   */
  const getRoomUtilization = useCallback(
    async (dateFrom: string, dateTo: string): Promise<TheatreUtilization[]> => {
      if (!staff) return [];

      setLoading(true);
      setError(null);

      try {
        // Get all rooms and their schedules
        const { data: rooms, error: roomsError } = await supabase
          .from('theatre_rooms')
          .select('id, room_name')
          .eq('facility_id', staff.facility_id)
          .eq('is_active', true);

        if (roomsError) throw roomsError;

        const { data: schedules, error: schedulesError } = await supabase
          .from('theatre_schedules')
          .select('theatre_room_id, start_time, end_time, schedule_status')
          .eq('facility_id', staff.facility_id)
          .gte('scheduled_date', dateFrom)
          .lte('scheduled_date', dateTo);

        if (schedulesError) throw schedulesError;

        // Calculate utilization per room
        return (rooms || []).map((room) => {
          const roomSchedules = (schedules || []).filter(
            (s) =>
              s.theatre_room_id === room.id &&
              s.schedule_status !== 'Cancelled',
          );

          const totalMinutes = roomSchedules.reduce((sum, s) => {
            const start = new Date(`1970-01-01T${s.start_time}`);
            const end = new Date(`1970-01-01T${s.end_time}`);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60);
          }, 0);

          // Assume 10 hours availability per day
          const daysCount =
            Math.ceil(
              (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) /
                (1000 * 60 * 60 * 24),
            ) + 1;
          const availableMinutes = daysCount * 10 * 60;

          return {
            room_id: room.id,
            room_name: room.room_name,
            total_scheduled_minutes: totalMinutes,
            total_available_minutes: availableMinutes,
            utilization_percentage: Math.round(
              (totalMinutes / availableMinutes) * 100,
            ),
            surgeries_count: roomSchedules.length,
            delays_count: roomSchedules.filter(
              (s) => s.schedule_status === 'Delayed',
            ).length,
            average_turnover_minutes: 0, // Would need more data to calculate
          };
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to get utilization';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    error,
    listTheatreRooms,
    createTheatreRoom,
    updateRoomStatus,
    getRoomUtilization,
  };
}

// ============================================================================
// THEATRE SCHEDULES HOOKS
// ============================================================================

/**
 * Hook for theatre schedule management
 */
export function useTheatreSchedules() {
  const { staff } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * List schedules with filters
   */
  const listSchedules = useCallback(
    async (
      filters: TheatreScheduleFilters = {},
    ): Promise<TheatreScheduleWithDetails[]> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('theatre_schedules')
          .select(
            `
            *,
            theatre_rooms:theatre_room_id(room_name, room_code),
            surgeries:surgery_id(
              surgery_number, primary_procedure,
              patients:patient_id(first_name, surname, emr_number)
            ),
            surgeon:primary_surgeon_id(first_name, last_name),
            anesthetist:anesthetist_id(first_name, last_name)
          `,
          )
          .order('scheduled_date')
          .order('start_time');

        if (filters.date_from) {
          query = query.gte('scheduled_date', filters.date_from);
        }
        if (filters.date_to) {
          query = query.lte('scheduled_date', filters.date_to);
        }
        if (filters.theatre_room_id) {
          query = query.eq('theatre_room_id', filters.theatre_room_id);
        }
        if (filters.surgeon_id) {
          query = query.eq('primary_surgeon_id', filters.surgeon_id);
        }
        if (filters.schedule_status?.length) {
          query = query.in('schedule_status', filters.schedule_status);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        return (data || []).map((schedule) => ({
          ...schedule,
          theatre_room_name: schedule.theatre_rooms?.room_name,
          theatre_room_code: schedule.theatre_rooms?.room_code,
          surgery_number: schedule.surgeries?.surgery_number,
          patient_name: schedule.surgeries?.patients
            ? `${schedule.surgeries.patients.first_name} ${schedule.surgeries.patients.surname}`
            : undefined,
          patient_emr_number: schedule.surgeries?.patients?.emr_number,
          primary_procedure: schedule.surgeries?.primary_procedure,
          surgeon_name: schedule.surgeon
            ? `${schedule.surgeon.first_name} ${schedule.surgeon.last_name}`
            : undefined,
          anesthetist_name: schedule.anesthetist
            ? `${schedule.anesthetist.first_name} ${schedule.anesthetist.last_name}`
            : undefined,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch schedules';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Create a theatre schedule
   */
  const createSchedule = useCallback(
    async (data: TheatreScheduleFormData): Promise<TheatreSchedule | null> => {
      if (!staff) {
        setError('No user context');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: schedule, error: createError } = await supabase
          .from('theatre_schedules')
          .insert({
            ...data,
            created_by: staff.id,
          })
          .select()
          .single();

        if (createError) {
          // Check for overlap constraint violation
          if (createError.code === '23P01') {
            throw new Error(
              'This time slot conflicts with an existing schedule',
            );
          }
          throw createError;
        }
        return schedule;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create schedule';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Update schedule status
   */
  const updateScheduleStatus = useCallback(
    async (
      scheduleId: string,
      status: TheatreSchedule['schedule_status'],
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('theatre_schedules')
          .update({
            schedule_status: status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', scheduleId);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update schedule';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Delete a schedule
   */
  const deleteSchedule = useCallback(
    async (scheduleId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: deleteError } = await supabase
          .from('theatre_schedules')
          .delete()
          .eq('id', scheduleId);

        if (deleteError) throw deleteError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete schedule';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    error,
    listSchedules,
    createSchedule,
    updateScheduleStatus,
    deleteSchedule,
  };
}

// ============================================================================
// PRE-OP ASSESSMENT HOOKS
// ============================================================================

/**
 * Hook for pre-operative assessment management
 */
export function usePreopAssessments() {
  const { staff } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get pre-op assessment for a surgery
   */
  const getAssessment = useCallback(
    async (surgeryId: string): Promise<SurgeryPreopAssessment | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('surgery_preop_assessments')
          .select('*')
          .eq('surgery_id', surgeryId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch assessment';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Create or update pre-op assessment
   */
  const saveAssessment = useCallback(
    async (
      surgeryId: string,
      data: PreopAssessmentFormData,
    ): Promise<boolean> => {
      if (!staff) {
        setError('No user context');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const { error: upsertError } = await supabase
          .from('surgery_preop_assessments')
          .upsert(
            {
              surgery_id: surgeryId,
              ...data,
              assessed_by: staff.id,
              assessment_date: new Date().toISOString(),
            },
            {
              onConflict: 'surgery_id',
            },
          );

        if (upsertError) throw upsertError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to save assessment';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    error,
    getAssessment,
    saveAssessment,
  };
}

// ============================================================================
// ANESTHESIA RECORD HOOKS
// ============================================================================

/**
 * Hook for anesthesia record management
 */
export function useAnesthesiaRecords() {
  const { staff } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get anesthesia record for a surgery
   */
  const getRecord = useCallback(
    async (surgeryId: string): Promise<SurgeryAnesthesiaRecord | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('surgery_anesthesia_records')
          .select('*')
          .eq('surgery_id', surgeryId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to fetch anesthesia record';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Create anesthesia record
   */
  const createRecord = useCallback(
    async (
      surgeryId: string,
      data: AnesthesiaRecordFormData,
    ): Promise<boolean> => {
      if (!staff) {
        setError('No user context');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const { error: createError } = await supabase
          .from('surgery_anesthesia_records')
          .insert({
            surgery_id: surgeryId,
            anesthetist_id: staff.id,
            ...data,
            created_by: staff.id,
          });

        if (createError) throw createError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to create anesthesia record';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Update anesthesia record
   */
  const updateRecord = useCallback(
    async (
      recordId: string,
      data: Partial<AnesthesiaRecordFormData>,
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('surgery_anesthesia_records')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recordId)
          .eq('signed_off', false); // Can only update non-signed records

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to update anesthesia record';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Sign off anesthesia record
   */
  const signOffRecord = useCallback(
    async (recordId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('surgery_anesthesia_records')
          .update({
            signed_off: true,
            signed_off_at: new Date().toISOString(),
          })
          .eq('id', recordId);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to sign off';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    error,
    getRecord,
    createRecord,
    updateRecord,
    signOffRecord,
  };
}

// ============================================================================
// SURGERY CONSUMABLES HOOKS
// ============================================================================

/**
 * Hook for surgery consumables management
 */
export function useSurgeryConsumables() {
  const { staff } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * List consumables for a surgery
   */
  const listConsumables = useCallback(
    async (surgeryId: string): Promise<SurgeryConsumable[]> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('surgery_consumables')
          .select('*')
          .eq('surgery_id', surgeryId)
          .order('recorded_at');

        if (fetchError) throw fetchError;
        return data || [];
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch consumables';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Add consumable to surgery
   */
  const addConsumable = useCallback(
    async (
      surgeryId: string,
      data: SurgeryConsumableFormData,
    ): Promise<boolean> => {
      if (!staff) {
        setError('No user context');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const totalCost = data.unit_cost
          ? data.quantity_used * data.unit_cost
          : null;

        const { error: createError } = await supabase
          .from('surgery_consumables')
          .insert({
            surgery_id: surgeryId,
            ...data,
            total_cost: totalCost,
            recorded_by: staff.id,
          });

        if (createError) throw createError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to add consumable';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Remove consumable from surgery
   */
  const removeConsumable = useCallback(
    async (consumableId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: deleteError } = await supabase
          .from('surgery_consumables')
          .delete()
          .eq('id', consumableId);

        if (deleteError) throw deleteError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to remove consumable';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get implants for a surgery
   */
  const getImplants = useCallback(
    async (surgeryId: string): Promise<SurgeryConsumable[]> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('surgery_consumables')
          .select('*')
          .eq('surgery_id', surgeryId)
          .eq('is_implant', true);

        if (fetchError) throw fetchError;
        return data || [];
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch implants';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    error,
    listConsumables,
    addConsumable,
    removeConsumable,
    getImplants,
  };
}
