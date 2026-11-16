/**
 * Hygiene/Infection Control Module API Hooks
 * Encounter-centric hygiene care documentation and infection surveillance
 */

import { useCallback, useState, useEffect } from 'react';
import { supabase } from '../../../api/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import {
  HygieneActivityCatalogue,
  HygieneActivityCatalogueFormData,
  HygieneCareRecord,
  HygieneCareRecordFormData,
  HygieneCareRecordWithDetails,
  HygieneCareSchedule,
  HygieneCareScheduleFormData,
  HygieneCareScheduleWithDetails,
  InfectionSurveillance,
  InfectionSurveillanceFormData,
  InfectionSurveillanceWithDetails,
  HygieneRecordFilters,
  HygieneScheduleFilters,
  InfectionFilters,
  HygieneDashboardStats,
  WardComplianceStats,
  ShiftComplianceStats,
  InfectionDashboardStats,
  HygieneWorklistItem,
  PatientHygieneProfile,
  HygieneActivityCategory,
  HygieneStatus,
  Shift,
  getShiftFromTime,
} from '../types/hygiene.types';

// ============================================================================
// HYGIENE ACTIVITY CATALOGUE HOOKS
// ============================================================================

/**
 * Hook for hygiene activity catalogue management
 */
export function useHygieneActivityCatalogue() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<HygieneActivityCatalogue[]>([]);

  /**
   * Load all hygiene activities on mount
   */
  useEffect(() => {
    listActivities();
  }, []);

  /**
   * List all hygiene activities
   */
  const listActivities = useCallback(
    async (activeOnly = true): Promise<HygieneActivityCatalogue[]> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('hygiene_activity_catalogue')
          .select('*')
          .order('category')
          .order('activity_name');

        if (activeOnly) {
          query = query.eq('is_active', true);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setActivities(data || []);
        return data || [];
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch activities';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * List activities by category
   */
  const listByCategory = useCallback(
    async (
      category: HygieneActivityCategory,
    ): Promise<HygieneActivityCatalogue[]> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('hygiene_activity_catalogue')
          .select('*')
          .eq('category', category)
          .eq('is_active', true)
          .order('activity_name');

        if (fetchError) throw fetchError;
        return data || [];
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch activities';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Create a new activity
   */
  const createActivity = useCallback(
    async (
      data: HygieneActivityCatalogueFormData,
    ): Promise<HygieneActivityCatalogue | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data: activity, error: createError } = await supabase
          .from('hygiene_activity_catalogue')
          .insert(data)
          .select()
          .single();

        if (createError) throw createError;
        // Refresh activities list
        await listActivities();
        return activity;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create activity';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [listActivities],
  );

  /**
   * Update an activity
   */
  const updateActivity = useCallback(
    async (
      activityId: string,
      data: Partial<HygieneActivityCatalogueFormData>,
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('hygiene_activity_catalogue')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activityId);

        if (updateError) throw updateError;
        // Refresh activities list
        await listActivities();
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update activity';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [listActivities],
  );

  return {
    loading,
    error,
    activities,
    listActivities,
    listByCategory,
    createActivity,
    updateActivity,
  };
}

// ============================================================================
// HYGIENE CARE RECORDS HOOKS
// ============================================================================

/**
 * Hook for hygiene care record management
 */
export function useHygieneCareRecords() {
  const { staff } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<HygieneCareRecordWithDetails[]>([]);

  /**
   * Fetch records with filters
   */
  const fetchRecords = useCallback(
    async (
      filters: HygieneRecordFilters = {},
    ): Promise<HygieneCareRecordWithDetails[]> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('hygiene_care_records')
          .select(
            `
            *,
            patients:patient_id(first_name, surname, emr_number)
          `,
          )
          .order('performed_time', { ascending: false });

        if (filters.patient_id) {
          query = query.eq('patient_id', filters.patient_id);
        }
        if (filters.encounter_id) {
          query = query.eq('encounter_id', filters.encounter_id);
        }
        if (filters.ward_id) {
          query = query.eq('ward_id', filters.ward_id);
        }
        if (filters.shift) {
          query = query.eq('shift', filters.shift);
        }

        const { data, error: fetchError } = await query.limit(100);

        if (fetchError) throw fetchError;

        const mapped = (data || []).map((record: any) => ({
          ...record,
          patient_name: record.patients
            ? `${record.patients.first_name} ${record.patients.surname}`
            : undefined,
          patient_emr_number: record.patients?.emr_number,
        }));

        setRecords(mapped);
        return mapped;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch records';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Create a hygiene care record
   */
  const createRecord = useCallback(
    async (
      encounterId: string,
      patientId: string,
      data: HygieneCareRecordFormData,
      admissionId?: string,
      wardId?: string,
      bedId?: string,
    ): Promise<HygieneCareRecord | null> => {
      if (!staff) {
        setError('No staff context');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const now = new Date();
        const shift = data.shift || getShiftFromTime(now);

        const { data: record, error: createError } = await supabase
          .from('hygiene_care_records')
          .insert({
            encounter_id: encounterId,
            patient_id: patientId,
            admission_id: admissionId || null,
            ward_id: wardId || null,
            bed_id: bedId || null,
            performed_by: staff.id,
            performed_time: data.performed_time || now.toISOString(),
            shift,
            ...data,
            created_by: staff.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        return record;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create record';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * List records with filters
   */
  const listRecords = useCallback(
    async (
      filters: HygieneRecordFilters = {},
    ): Promise<HygieneCareRecordWithDetails[]> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('hygiene_care_records')
          .select(
            `
            *,
            patients:patient_id(first_name, surname, emr_number),
            performed_by_staff:performed_by(first_name, last_name),
            assisted_by_staff:assisted_by(first_name, last_name),
            supervisor:supervisor_id(first_name, last_name),
            wards:ward_id(name),
            beds:bed_id(bed_number)
          `,
          )
          .order('performed_time', { ascending: false });

        // Apply filters
        if (filters.ward_id) {
          query = query.eq('ward_id', filters.ward_id);
        }
        if (filters.shift) {
          query = query.eq('shift', filters.shift);
        }
        if (filters.activity_category?.length) {
          query = query.in('activity_category', filters.activity_category);
        }
        if (filters.status?.length) {
          query = query.in('status', filters.status);
        }
        if (filters.date_from) {
          query = query.gte('performed_time', filters.date_from);
        }
        if (filters.date_to) {
          query = query.lte('performed_time', filters.date_to);
        }
        if (filters.performed_by) {
          query = query.eq('performed_by', filters.performed_by);
        }
        if (filters.requires_follow_up !== undefined) {
          query = query.eq('requires_follow_up', filters.requires_follow_up);
        }
        if (filters.supervisor_reviewed !== undefined) {
          query = query.eq('supervisor_reviewed', filters.supervisor_reviewed);
        }

        const { data, error: fetchError } = await query.limit(100);

        if (fetchError) throw fetchError;

        return (data || []).map((record) => ({
          ...record,
          patient_name: record.patients
            ? `${record.patients.first_name} ${record.patients.surname}`
            : undefined,
          patient_emr_number: record.patients?.emr_number,
          performed_by_name: record.performed_by_staff
            ? `${record.performed_by_staff.first_name} ${record.performed_by_staff.last_name}`
            : undefined,
          assisted_by_name: record.assisted_by_staff
            ? `${record.assisted_by_staff.first_name} ${record.assisted_by_staff.last_name}`
            : undefined,
          supervisor_name: record.supervisor
            ? `${record.supervisor.first_name} ${record.supervisor.last_name}`
            : undefined,
          ward_name: record.wards?.name,
          bed_number: record.beds?.bed_number,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch records';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get records for a specific encounter
   */
  const getByEncounter = useCallback(
    async (encounterId: string): Promise<HygieneCareRecordWithDetails[]> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('hygiene_care_records')
          .select(
            `
            *,
            performed_by_staff:performed_by(first_name, last_name)
          `,
          )
          .eq('encounter_id', encounterId)
          .order('performed_time', { ascending: false });

        if (fetchError) throw fetchError;

        return (data || []).map((record) => ({
          ...record,
          performed_by_name: record.performed_by_staff
            ? `${record.performed_by_staff.first_name} ${record.performed_by_staff.last_name}`
            : undefined,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch records';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get records for a specific patient/admission
   */
  const getByAdmission = useCallback(
    async (admissionId: string): Promise<HygieneCareRecordWithDetails[]> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('hygiene_care_records')
          .select(
            `
            *,
            performed_by_staff:performed_by(first_name, last_name)
          `,
          )
          .eq('admission_id', admissionId)
          .order('performed_time', { ascending: false });

        if (fetchError) throw fetchError;

        return (data || []).map((record) => ({
          ...record,
          performed_by_name: record.performed_by_staff
            ? `${record.performed_by_staff.first_name} ${record.performed_by_staff.last_name}`
            : undefined,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch records';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Update a hygiene record
   */
  const updateRecord = useCallback(
    async (
      recordId: string,
      data: Partial<HygieneCareRecordFormData>,
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('hygiene_care_records')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recordId);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update record';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Supervisor review of a record
   */
  const supervisorReview = useCallback(
    async (recordId: string, notes?: string): Promise<boolean> => {
      if (!staff) {
        setError('No staff context');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('hygiene_care_records')
          .update({
            supervisor_reviewed: true,
            supervisor_id: staff.id,
            supervisor_reviewed_at: new Date().toISOString(),
            supervisor_notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recordId);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to review record';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Document missed care
   */
  const documentMissedCare = useCallback(
    async (
      encounterId: string,
      patientId: string,
      activityCode: string,
      activityName: string,
      activityCategory: HygieneActivityCategory,
      missedReason: HygieneCareRecordFormData['missed_reason'],
      details?: string,
      admissionId?: string,
      wardId?: string,
    ): Promise<boolean> => {
      if (!staff) {
        setError('No staff context');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const now = new Date();

        const { error: createError } = await supabase
          .from('hygiene_care_records')
          .insert({
            encounter_id: encounterId,
            patient_id: patientId,
            admission_id: admissionId || null,
            ward_id: wardId || null,
            activity_code: activityCode,
            activity_name: activityName,
            activity_category: activityCategory,
            status: 'Missed' as HygieneStatus,
            missed_reason: missedReason,
            missed_reason_details: details || null,
            performed_by: staff.id,
            performed_time: now.toISOString(),
            shift: getShiftFromTime(now),
            patient_tolerance: 'Unable_To_Assess',
            created_by: staff.id,
          });

        if (createError) throw createError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to document missed care';
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
    records,
    fetchRecords,
    createRecord,
    listRecords,
    getByEncounter,
    getByAdmission,
    updateRecord,
    supervisorReview,
    documentMissedCare,
  };
}

// ============================================================================
// HYGIENE CARE SCHEDULES HOOKS
// ============================================================================

/**
 * Hook for hygiene care schedule management
 */
export function useHygieneCareSchedules() {
  const { staff } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<HygieneCareScheduleWithDetails[]>(
    [],
  );

  /**
   * Fetch schedules with filters
   */
  const fetchSchedules = useCallback(
    async (
      filters: HygieneScheduleFilters = {},
    ): Promise<HygieneCareScheduleWithDetails[]> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('hygiene_care_schedules')
          .select('*')
          .order('next_due', { ascending: true });

        if (filters.patient_id) {
          query = query.eq('patient_id', filters.patient_id);
        }
        if (filters.encounter_id) {
          query = query.eq('encounter_id', filters.encounter_id);
        }
        if (filters.admission_id) {
          query = query.eq('admission_id', filters.admission_id);
        }
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        } else {
          query = query.eq('is_active', true);
        }

        const { data, error: fetchError } = await query.limit(100);

        if (fetchError) throw fetchError;

        const mapped = (data || []).map((schedule: any) => ({
          ...schedule,
          requires_two_staff: schedule.requires_two_staff || false,
        }));

        setSchedules(mapped);
        return mapped;
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
   * Create a care schedule
   */
  const createSchedule = useCallback(
    async (
      encounterId: string,
      patientId: string,
      data: HygieneCareScheduleFormData,
      admissionId?: string,
    ): Promise<HygieneCareSchedule | null> => {
      if (!staff) {
        setError('No staff context');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        // Calculate next due time
        const startDate = new Date(data.start_date);
        let nextDue: Date = startDate;

        if (data.frequency_hours) {
          nextDue = new Date(
            startDate.getTime() + data.frequency_hours * 60 * 60 * 1000,
          );
        }

        const { data: schedule, error: createError } = await supabase
          .from('hygiene_care_schedules')
          .insert({
            encounter_id: encounterId,
            patient_id: patientId,
            admission_id: admissionId || null,
            ...data,
            next_due: nextDue.toISOString(),
            is_active: true,
            created_by: staff.id,
          })
          .select()
          .single();

        if (createError) throw createError;
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
   * List schedules with filters
   */
  const listSchedules = useCallback(
    async (
      filters: HygieneScheduleFilters = {},
    ): Promise<HygieneCareScheduleWithDetails[]> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('hygiene_care_schedules')
          .select(
            `
            *,
            patients:patient_id(first_name, surname, emr_number),
            admissions:admission_id(
              ward_id,
              current_bed_id,
              wards:ward_id(name),
              beds:beds!admissions_current_bed_id_fkey(bed_number)
            )
          `,
          )
          .order('next_due', { ascending: true });

        if (filters.ward_id) {
          query = query.eq('admissions.ward_id', filters.ward_id);
        }
        if (filters.activity_category?.length) {
          // Would need to join to catalogue for category filter
        }
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        }
        if (filters.is_overdue) {
          query = query.lt('next_due', new Date().toISOString());
        }
        if (filters.linked_surgery_id) {
          query = query.eq('linked_surgery_id', filters.linked_surgery_id);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        return (data || []).map((schedule) => ({
          ...schedule,
          patient_name: schedule.patients
            ? `${schedule.patients.first_name} ${schedule.patients.surname}`
            : undefined,
          patient_emr_number: schedule.patients?.emr_number,
          ward_name: schedule.admissions?.wards?.name,
          bed_number: schedule.admissions?.beds?.bed_number,
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
   * Get schedules for a patient
   */
  const getByPatient = useCallback(
    async (
      patientId: string,
      activeOnly = true,
    ): Promise<HygieneCareSchedule[]> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('hygiene_care_schedules')
          .select('*')
          .eq('patient_id', patientId)
          .order('next_due');

        if (activeOnly) {
          query = query.eq('is_active', true);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        return data || [];
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
   * Update next_due after completing a care activity
   */
  const updateNextDue = useCallback(
    async (scheduleId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        // First get the schedule to calculate new next_due
        const { data: schedule, error: fetchError } = await supabase
          .from('hygiene_care_schedules')
          .select('frequency_hours, end_date')
          .eq('id', scheduleId)
          .single();

        if (fetchError) throw fetchError;

        if (!schedule) {
          setError('Schedule not found');
          return false;
        }

        const now = new Date();
        let nextDue: Date | null = null;
        let isActive = true;

        if (schedule.frequency_hours) {
          nextDue = new Date(
            now.getTime() + schedule.frequency_hours * 60 * 60 * 1000,
          );

          // Check if past end date
          if (schedule.end_date && nextDue > new Date(schedule.end_date)) {
            isActive = false;
            nextDue = null;
          }
        }

        const { error: updateError } = await supabase
          .from('hygiene_care_schedules')
          .update({
            next_due: nextDue?.toISOString() || null,
            is_active: isActive,
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
   * Pause a schedule
   */
  const pauseSchedule = useCallback(
    async (scheduleId: string, reason: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('hygiene_care_schedules')
          .update({
            is_active: false,
            paused_reason: reason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', scheduleId);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to pause schedule';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Resume a schedule
   */
  const resumeSchedule = useCallback(
    async (scheduleId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('hygiene_care_schedules')
          .update({
            is_active: true,
            paused_reason: null,
            next_due: new Date().toISOString(), // Due immediately
            updated_at: new Date().toISOString(),
          })
          .eq('id', scheduleId);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to resume schedule';
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
    schedules,
    fetchSchedules,
    createSchedule,
    listSchedules,
    getByPatient,
    updateNextDue,
    pauseSchedule,
    resumeSchedule,
  };
}

// ============================================================================
// INFECTION SURVEILLANCE HOOKS
// ============================================================================

/**
 * Hook for infection surveillance management
 */
export function useInfectionSurveillance() {
  const { staff } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infections, setInfections] = useState<
    InfectionSurveillanceWithDetails[]
  >([]);

  /**
   * Fetch infections with filters
   */
  const fetchInfections = useCallback(
    async (
      filters: InfectionFilters = {},
    ): Promise<InfectionSurveillanceWithDetails[]> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('infection_surveillance')
          .select(
            `
            *,
            patient:patient_id(first_name, surname, emr_number)
          `,
          )
          .order('detected_date', { ascending: false });

        if (filters.infection_type?.length) {
          query = query.in('infection_type', filters.infection_type);
        }
        if (filters.severity?.length) {
          query = query.in('severity', filters.severity);
        }
        if (filters.outcome?.length) {
          query = query.in('outcome', filters.outcome);
        }
        if (filters.device_related !== undefined) {
          query = query.eq('is_device_related', filters.device_related);
        }
        if (filters.reported_to_ic !== undefined) {
          query = query.eq('reported_to_ic', filters.reported_to_ic);
        }

        const { data, error: fetchError } = await query.limit(100);

        if (fetchError) throw fetchError;

        const mapped = (data || []).map((inf: any) => ({
          ...inf,
          patient: inf.patient
            ? {
                full_name: `${inf.patient.first_name} ${inf.patient.surname}`,
                emr_number: inf.patient.emr_number,
              }
            : undefined,
        }));

        setInfections(mapped);
        return mapped;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch infections';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Create an infection surveillance record
   */
  const createRecord = useCallback(
    async (
      encounterId: string,
      patientId: string,
      data: InfectionSurveillanceFormData,
      admissionId?: string,
    ): Promise<InfectionSurveillance | null> => {
      if (!staff) {
        setError('No staff context');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: record, error: createError } = await supabase
          .from('infection_surveillance')
          .insert({
            encounter_id: encounterId,
            patient_id: patientId,
            admission_id: admissionId || null,
            detected_by: staff.id,
            ...data,
            created_by: staff.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        return record;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to create infection record';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * List infections with filters
   */
  const listInfections = useCallback(
    async (
      filters: InfectionFilters = {},
    ): Promise<InfectionSurveillanceWithDetails[]> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('infection_surveillance')
          .select(
            `
            *,
            patients:patient_id(first_name, surname, emr_number),
            detected_by_staff:detected_by(first_name, last_name),
            ic_officer:ic_officer_id(first_name, last_name),
            surgeries:surgery_id(surgery_number)
          `,
          )
          .order('detected_date', { ascending: false });

        // Apply filters
        if (filters.infection_type?.length) {
          query = query.in('infection_type', filters.infection_type);
        }
        if (filters.severity?.length) {
          query = query.in('severity', filters.severity);
        }
        if (filters.outcome?.length) {
          query = query.in('outcome', filters.outcome);
        }
        if (filters.device_related !== undefined) {
          query = query.eq('device_related', filters.device_related);
        }
        if (filters.date_from) {
          query = query.gte('detected_date', filters.date_from);
        }
        if (filters.date_to) {
          query = query.lte('detected_date', filters.date_to);
        }
        if (filters.reported_to_ic !== undefined) {
          query = query.eq('reported_to_ic', filters.reported_to_ic);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        return (data || []).map((record) => ({
          ...record,
          patient_name: record.patients
            ? `${record.patients.first_name} ${record.patients.surname}`
            : undefined,
          patient_emr_number: record.patients?.emr_number,
          detected_by_name: record.detected_by_staff
            ? `${record.detected_by_staff.first_name} ${record.detected_by_staff.last_name}`
            : undefined,
          ic_officer_name: record.ic_officer
            ? `${record.ic_officer.first_name} ${record.ic_officer.last_name}`
            : undefined,
          surgery_number: record.surgeries?.surgery_number,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch infections';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get infections for a patient
   */
  const getByPatient = useCallback(
    async (patientId: string): Promise<InfectionSurveillance[]> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('infection_surveillance')
          .select('*')
          .eq('patient_id', patientId)
          .order('detected_date', { ascending: false });

        if (fetchError) throw fetchError;
        return data || [];
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch infections';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get surgery-related infections (SSI)
   */
  const getBySurgery = useCallback(
    async (surgeryId: string): Promise<InfectionSurveillance[]> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('infection_surveillance')
          .select('*')
          .eq('surgery_id', surgeryId)
          .order('detected_date');

        if (fetchError) throw fetchError;
        return data || [];
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch infections';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Update infection record
   */
  const updateRecord = useCallback(
    async (
      recordId: string,
      data: Partial<InfectionSurveillanceFormData>,
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('infection_surveillance')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recordId);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update infection';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Report to Infection Control
   */
  const reportToIC = useCallback(async (recordId: string): Promise<boolean> => {
    if (!staff) {
      setError('No staff context');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('infection_surveillance')
        .update({
          reported_to_ic: true,
          reported_date: new Date().toISOString().split('T')[0],
          ic_officer_id: staff.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to report';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get infection dashboard statistics
   */
  const getDashboardStats =
    useCallback(async (): Promise<InfectionDashboardStats | null> => {
      setLoading(true);
      setError(null);

      try {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const { data, error: fetchError } = await supabase
          .from('infection_surveillance')
          .select(
            'id, infection_type, outcome, device_related, detected_date, resolution_date',
          );

        if (fetchError) throw fetchError;

        const infections = data || [];

        return {
          active_infections: infections.filter((i) => i.outcome === 'Ongoing')
            .length,
          new_this_week: infections.filter(
            (i) => new Date(i.detected_date) >= weekAgo,
          ).length,
          new_this_month: infections.filter(
            (i) => new Date(i.detected_date) >= monthAgo,
          ).length,
          resolved_this_month: infections.filter(
            (i) =>
              i.outcome === 'Resolved' &&
              i.resolution_date &&
              new Date(i.resolution_date) >= monthAgo,
          ).length,
          ssi_count: infections.filter((i) => i.infection_type === 'SSI')
            .length,
          cauti_count: infections.filter((i) => i.infection_type === 'CAUTI')
            .length,
          clabsi_count: infections.filter((i) => i.infection_type === 'CLABSI')
            .length,
          vap_count: infections.filter((i) => i.infection_type === 'VAP')
            .length,
          device_related_percentage:
            infections.length > 0
              ? Math.round(
                  (infections.filter((i) => i.device_related).length /
                    infections.length) *
                    100,
                )
              : 0,
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

  /**
   * Resolve an infection (update outcome)
   */
  const resolveInfection = useCallback(
    async (
      infectionId: string,
      outcome:
        | 'Resolved'
        | 'Ongoing'
        | 'Worsened'
        | 'Death_Related'
        | 'Death_Unrelated',
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('infection_surveillance')
          .update({
            outcome,
            resolution_date:
              outcome === 'Resolved' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', infectionId);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to resolve infection';
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
    infections,
    fetchInfections,
    createRecord,
    listInfections,
    getByPatient,
    getBySurgery,
    updateRecord,
    reportToIC,
    resolveInfection,
    getDashboardStats,
  };
}

// ============================================================================
// HYGIENE DASHBOARD HOOKS
// ============================================================================

/**
 * Hook for hygiene dashboard and analytics
 */
export function useHygieneDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get hygiene dashboard statistics
   */
  const getDashboardStats = useCallback(
    async (wardId?: string): Promise<HygieneDashboardStats | null> => {
      setLoading(true);
      setError(null);

      try {
        const today = new Date().toISOString().split('T')[0];
        const todayStart = `${today}T00:00:00`;
        const todayEnd = `${today}T23:59:59`;

        let query = supabase
          .from('hygiene_care_records')
          .select('id, status, supervisor_reviewed')
          .gte('performed_time', todayStart)
          .lte('performed_time', todayEnd);

        if (wardId) {
          query = query.eq('ward_id', wardId);
        }

        const { data: records, error: recordsError } = await query;

        if (recordsError) throw recordsError;

        // Get overdue schedules
        const schedulesQuery = supabase
          .from('hygiene_care_schedules')
          .select('id')
          .eq('is_active', true)
          .lt('next_due', new Date().toISOString());

        const { data: overdueSchedules, error: schedulesError } =
          await schedulesQuery;

        if (schedulesError) throw schedulesError;

        // Get active schedules count
        const { count: activeCount, error: activeError } = await supabase
          .from('hygiene_care_schedules')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true);

        if (activeError) throw activeError;

        const todayRecords = records || [];
        const total = todayRecords.length;
        const completed = todayRecords.filter(
          (r) => r.status === 'Completed',
        ).length;

        return {
          today_completed: completed,
          today_missed: todayRecords.filter((r) => r.status === 'Missed')
            .length,
          today_refused: todayRecords.filter((r) => r.status === 'Refused')
            .length,
          today_deferred: todayRecords.filter((r) => r.status === 'Deferred')
            .length,
          overdue_count: (overdueSchedules || []).length,
          compliance_rate:
            total > 0 ? Math.round((completed / total) * 100) : 100,
          pending_supervisor_review: todayRecords.filter(
            (r) => !r.supervisor_reviewed,
          ).length,
          active_schedules: activeCount || 0,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch stats';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get ward compliance statistics
   */
  const getWardCompliance = useCallback(
    async (
      dateFrom: string,
      dateTo: string,
    ): Promise<WardComplianceStats[]> => {
      setLoading(true);
      setError(null);

      try {
        // Use the view for compliance data
        const { data, error: fetchError } = await supabase
          .from('hygiene_compliance_view')
          .select('*')
          .gte('care_date', dateFrom)
          .lte('care_date', dateTo);

        if (fetchError) throw fetchError;

        // Aggregate by ward
        const wardMap = new Map<string, WardComplianceStats>();

        (data || []).forEach((row) => {
          const existing = wardMap.get(row.ward_id) || {
            ward_id: row.ward_id,
            ward_name: row.ward_name || 'Unknown',
            total_scheduled: 0,
            completed: 0,
            missed: 0,
            refused: 0,
            compliance_rate: 0,
            by_category: {} as Record<
              HygieneActivityCategory,
              {
                scheduled: number;
                completed: number;
                compliance_rate: number;
              }
            >,
          };

          existing.total_scheduled += row.total_records;
          existing.completed += row.completed;
          existing.missed += row.missed;
          existing.refused += row.refused;

          wardMap.set(row.ward_id, existing);
        });

        return Array.from(wardMap.values()).map((ward) => ({
          ...ward,
          compliance_rate:
            ward.total_scheduled > 0
              ? Math.round((ward.completed / ward.total_scheduled) * 100)
              : 100,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch compliance';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get shift compliance statistics
   */
  const getShiftCompliance = useCallback(
    async (date: string, wardId?: string): Promise<ShiftComplianceStats[]> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('hygiene_care_records')
          .select('shift, status')
          .gte('performed_time', `${date}T00:00:00`)
          .lte('performed_time', `${date}T23:59:59`);

        if (wardId) {
          query = query.eq('ward_id', wardId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const shifts: Shift[] = ['Morning', 'Afternoon', 'Night'];

        return shifts.map((shift) => {
          const shiftRecords = (data || []).filter((r) => r.shift === shift);
          const total = shiftRecords.length;
          const completed = shiftRecords.filter(
            (r) => r.status === 'Completed',
          ).length;
          const missed = shiftRecords.filter(
            (r) => r.status === 'Missed',
          ).length;
          const refused = shiftRecords.filter(
            (r) => r.status === 'Refused',
          ).length;

          return {
            shift,
            date,
            total_records: total,
            completed,
            missed,
            refused,
            compliance_rate:
              total > 0 ? Math.round((completed / total) * 100) : 100,
          };
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to fetch shift compliance';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get hygiene worklist for a ward
   */
  const getWorklist = useCallback(
    async (wardId: string): Promise<HygieneWorklistItem[]> => {
      setLoading(true);
      setError(null);

      try {
        const now = new Date();

        const { data: schedules, error: schedulesError } = await supabase
          .from('hygiene_care_schedules')
          .select(
            `
            id,
            activity_code,
            activity_name,
            next_due,
            linked_surgery_id,
            patients:patient_id(id, first_name, surname, emr_number),
            encounters:encounter_id(id),
            admissions:admission_id(
              id,
              ward_id,
              wards:ward_id(id, name),
              beds:bed_id(id, bed_number)
            ),
            activity_catalogue:activity_catalogue_id(
              category,
              requires_two_staff
            ),
            surgeries:linked_surgery_id(surgery_number, scheduled_date)
          `,
          )
          .eq('is_active', true)
          .eq('admissions.ward_id', wardId)
          .order('next_due');

        if (schedulesError) throw schedulesError;

        return (schedules || []).map((schedule: any) => {
          const nextDue = new Date(schedule.next_due);
          const minutesUntilDue = Math.floor(
            (nextDue.getTime() - now.getTime()) / (1000 * 60),
          );

          // Handle nested relations which may be objects or arrays
          const patient = Array.isArray(schedule.patients)
            ? schedule.patients[0]
            : schedule.patients;
          const encounter = Array.isArray(schedule.encounters)
            ? schedule.encounters[0]
            : schedule.encounters;
          const admission = Array.isArray(schedule.admissions)
            ? schedule.admissions[0]
            : schedule.admissions;
          const catalogue = Array.isArray(schedule.activity_catalogue)
            ? schedule.activity_catalogue[0]
            : schedule.activity_catalogue;
          const surgery = Array.isArray(schedule.surgeries)
            ? schedule.surgeries[0]
            : schedule.surgeries;
          const ward = admission
            ? Array.isArray(admission.wards)
              ? admission.wards[0]
              : admission.wards
            : null;
          const bed = admission
            ? Array.isArray(admission.beds)
              ? admission.beds[0]
              : admission.beds
            : null;

          return {
            schedule_id: schedule.id,
            patient_id: patient?.id || '',
            patient_name: patient
              ? `${patient.first_name} ${patient.surname}`
              : '',
            patient_emr_number: patient?.emr_number || '',
            encounter_id: encounter?.id || '',
            admission_id: admission?.id || null,
            ward_id: wardId,
            ward_name: ward?.name || '',
            bed_id: bed?.id || null,
            bed_number: bed?.bed_number || null,
            activity_code: schedule.activity_code,
            activity_name: schedule.activity_name,
            activity_category: catalogue?.category || 'OTHER',
            next_due: schedule.next_due,
            is_overdue: minutesUntilDue < 0,
            minutes_until_due: minutesUntilDue,
            last_completed: null, // Would need another query
            last_completed_by: null,
            requires_two_staff: catalogue?.requires_two_staff || false,
            linked_surgery_id: schedule.linked_surgery_id,
            surgery_date: surgery?.scheduled_date || null,
            infection_risk_flags: null,
          };
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch worklist';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get patient hygiene profile
   */
  const getPatientProfile = useCallback(
    async (
      patientId: string,
      encounterId: string,
    ): Promise<PatientHygieneProfile | null> => {
      setLoading(true);
      setError(null);

      try {
        // Get patient info
        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .select('id, first_name, surname')
          .eq('id', patientId)
          .single();

        if (patientError) throw patientError;

        // Get admission
        const { data: admission, error: admissionError } = await supabase
          .from('admissions')
          .select(
            `
            id,
            admission_date,
            wards:ward_id(name),
            beds:bed_id(bed_number)
          `,
          )
          .eq('patient_id', patientId)
          .eq('encounter_id', encounterId)
          .eq('status', 'Admitted')
          .single();

        if (admissionError && admissionError.code !== 'PGRST116')
          throw admissionError;

        // Get schedules
        const { data: schedules, error: schedulesError } = await supabase
          .from('hygiene_care_schedules')
          .select('*')
          .eq('patient_id', patientId)
          .eq('is_active', true);

        if (schedulesError) throw schedulesError;

        // Get recent records
        const { data: records, error: recordsError } = await supabase
          .from('hygiene_care_records')
          .select(
            `
            *,
            performed_by_staff:performed_by(first_name, last_name)
          `,
          )
          .eq('patient_id', patientId)
          .eq('encounter_id', encounterId)
          .order('performed_time', { ascending: false })
          .limit(20);

        if (recordsError) throw recordsError;

        // Get active infections
        const { data: infections, error: infectionsError } = await supabase
          .from('infection_surveillance')
          .select('*')
          .eq('patient_id', patientId)
          .eq('outcome', 'Ongoing');

        if (infectionsError) throw infectionsError;

        // Get linked surgeries
        const { data: surgeries, error: surgeriesError } = await supabase
          .from('surgeries')
          .select(
            'id, surgery_number, primary_procedure, scheduled_date, wound_classification',
          )
          .eq('patient_id', patientId)
          .eq('encounter_id', encounterId);

        if (surgeriesError) throw surgeriesError;

        // Calculate today's compliance
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = ((records || []) as any[]).filter((r) =>
          r.performed_time?.startsWith(today),
        );
        const completed = todayRecords.filter(
          (r) => r.status === 'Completed',
        ).length;
        const total = todayRecords.length;

        // Handle nested relations which may be objects or arrays
        const ward = admission
          ? Array.isArray(admission.wards)
            ? admission.wards[0]
            : admission.wards
          : null;
        const bed = admission
          ? Array.isArray(admission.beds)
            ? admission.beds[0]
            : admission.beds
          : null;

        // Calculate missed/refused today
        const missed = todayRecords.filter((r) => r.status === 'Missed').length;
        const refused = todayRecords.filter(
          (r) => r.status === 'Refused',
        ).length;
        const overdue = (schedules || []).filter(
          (s: any) => new Date(s.next_due) < new Date() && s.is_active,
        ).length;

        return {
          patient_id: patientId,
          patient_name: `${patient.first_name} ${patient.surname}`,
          encounter_id: encounterId,
          admission_id: admission?.id || null,
          ward_name: ward?.name || '',
          bed_number: bed?.bed_number || null,
          admission_date: admission?.admission_date || null,
          active_schedules: (schedules || []).length,
          pending_activities: [], // Would need worklist calculation
          recent_records: ((records || []) as any[]).map((r) => ({
            ...r,
            performed_by_name: r.performed_by_staff
              ? `${r.performed_by_staff.first_name} ${r.performed_by_staff.last_name}`
              : undefined,
          })),
          compliance_today:
            total > 0 ? Math.round((completed / total) * 100) : 100,
          today_completed: completed,
          today_missed: missed,
          today_refused: refused,
          compliance_rate:
            total > 0 ? Math.round((completed / total) * 100) : 100,
          overdue_activities: overdue,
          has_active_infection: (infections || []).length > 0,
          linked_surgery_ids: (surgeries || []).map((s) => s.id),
          infection_risk_flags: {}, // Would need to aggregate from records
          active_infections: infections || [],
          linked_surgeries: (surgeries || []).map((s) => ({
            surgery_id: s.id,
            surgery_number: s.surgery_number,
            procedure_name: s.primary_procedure,
            surgery_date: s.scheduled_date,
            wound_classification: s.wound_classification,
          })),
        };
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to fetch patient profile';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    loading,
    error,
    getDashboardStats,
    getWardCompliance,
    getShiftCompliance,
    getWorklist,
    getPatientProfile,
  };
}
