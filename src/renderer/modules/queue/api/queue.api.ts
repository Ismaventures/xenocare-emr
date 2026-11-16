import { supabase } from '../../../api/supabaseClient';
import {
  QueueDTO,
  QueueLabRequestDTO,
  CreateQueueDTO,
  UpdateQueueDTO,
  QueueFilters,
  QueueStats,
  DepartmentQueue,
  Department,
  DEPARTMENTS,
  toDbQueueLocation,
  fromDbQueueLocation,
} from '../dtos/queue.dto';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// =============================================================================
// API Functions
// =============================================================================

async function enrichQueueEntries(
  rows: Record<string, any>[] | null,
): Promise<QueueDTO[]> {
  if (!rows || rows.length === 0) {
    return [];
  }

  const normalized = rows.map((row) => ({
    ...row,
    location: fromDbQueueLocation(row.location),
  })) as QueueDTO[];

  const labEntries = normalized.filter(
    (entry) => entry.location === 'Laboratory',
  );

  const uniqueVisitIds = Array.from(
    new Set(
      labEntries
        .map((entry) => entry.visit_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const rawPatientIdentifiers = labEntries.flatMap((entry) => [
    entry.patient_id,
    entry.patient?.patient_id,
  ]);

  const uniquePatientIdentifiers = Array.from(
    new Set(
      rawPatientIdentifiers.filter((value): value is string => Boolean(value)),
    ),
  );

  const patientUuidCandidates = uniquePatientIdentifiers.filter((id) =>
    UUID_REGEX.test(id),
  );
  const patientPublicIds = uniquePatientIdentifiers.filter(
    (id) => !UUID_REGEX.test(id),
  );

  let resolvedPublicPatientUuids: string[] = [];
  if (patientPublicIds.length > 0) {
    const { data: patientRows, error: patientError } = await supabase
      .from('patients')
      .select('id, patient_id')
      .in('patient_id', patientPublicIds);

    if (patientError) throw patientError;

    resolvedPublicPatientUuids = (patientRows || [])
      .map((row) => row.id)
      .filter((id): id is string => Boolean(id));
  }

  const labPatientUuidIds = Array.from(
    new Set([...patientUuidCandidates, ...resolvedPublicPatientUuids]),
  );

  const labRequestsByKey = new Map<string, QueueLabRequestDTO[]>();

  if (uniqueVisitIds.length > 0 || labPatientUuidIds.length > 0) {
    const statuses = [
      'Pending',
      'Accepted',
      'Awaiting_Payment',
      'Paid',
      'Waived',
      'Sample Collected',
      'Sample_Collected',
      'In Progress',
      'Processing',
      'Result_Ready',
    ];

    const formatInValues = (values: string[]) =>
      values.map((value) => `"${value.replace(/"/g, '""')}"`).join(',');

    const buildInCondition = (column: string, values: string[]) => {
      if (values.length === 0) return null;
      return `${column}.in.(${formatInValues(values)})`;
    };

    let query = supabase
      .from('lab_requests')
      .select(
        `
        request_id,
        visit_id,
        encounter_id,
        patient_id,
        test_id,
        status,
        priority,
        clinical_notes,
        test:lab_test_catalogue(
          id,
          name,
          code,
          category,
          price,
          specimen_type
        ),
        patient:patients(
          patient_id
        )
      `,
      )
      .in('status', statuses);

    const visitCondition = buildInCondition('visit_id', uniqueVisitIds);
    const encounterCondition = buildInCondition('encounter_id', uniqueVisitIds);
    const patientCondition = buildInCondition('patient_id', labPatientUuidIds);

    const orConditions = [
      visitCondition,
      encounterCondition,
      patientCondition,
    ].filter((condition): condition is string => Boolean(condition));

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }

    const { data: labRows, error: labError } = await query;

    if (labError) throw labError;

    const registerRequest = (
      key: string | null | undefined,
      request: QueueLabRequestDTO,
    ) => {
      if (!key) return;
      const existing = labRequestsByKey.get(key) || [];
      if (!existing.some((r) => r.request_id === request.request_id)) {
        existing.push(request);
        labRequestsByKey.set(key, existing);
      }
    };

    (labRows || []).forEach((labRow) => {
      const request: QueueLabRequestDTO = {
        request_id: labRow.request_id,
        visit_id: labRow.visit_id,
        status: labRow.status,
        priority:
          (labRow.priority as QueueLabRequestDTO['priority']) || 'Normal',
        clinical_notes: labRow.clinical_notes,
        test_id: labRow.test_id,
        test: labRow.test
          ? {
              id: labRow.test.id,
              name: labRow.test.name,
              code: labRow.test.code,
              category: labRow.test.category,
              price: labRow.test.price,
              specimen_type: labRow.test.specimen_type,
            }
          : undefined,
      };

      registerRequest(labRow.visit_id as string | null, request);

      if (labRow.encounter_id) {
        registerRequest(labRow.encounter_id as string, request);
        registerRequest(`encounter:${labRow.encounter_id}`, request);
      }

      if (labRow.patient_id) {
        registerRequest(`patient_uuid:${labRow.patient_id}`, request);
      }

      const patientPublicId = labRow.patient?.patient_id as string | undefined;
      if (patientPublicId) {
        registerRequest(`patient_public:${patientPublicId}`, request);
      }
    });
  }

  return normalized.map((entry) => {
    if (entry.location !== 'Laboratory') {
      return entry;
    }

    const byVisit = entry.visit_id
      ? labRequestsByKey.get(entry.visit_id)
      : undefined;
    const byEncounter = entry.visit_id
      ? labRequestsByKey.get(`encounter:${entry.visit_id}`)
      : undefined;

    const patientLookupKeys = [
      entry.patient_id ? `patient_uuid:${entry.patient_id}` : null,
      entry.patient_id ? `patient_public:${entry.patient_id}` : null,
      entry.patient?.id ? `patient_uuid:${entry.patient.id}` : null,
      entry.patient?.patient_id
        ? `patient_public:${entry.patient.patient_id}`
        : null,
    ].filter((key): key is string => Boolean(key));

    const byPatient = patientLookupKeys
      .map((key) => labRequestsByKey.get(key))
      .find((requests) => requests && requests.length > 0);

    return {
      ...entry,
      lab_requests: byVisit || byEncounter || byPatient || [],
    };
  });
}

/**
 * Get queue entries with filters
 */
export async function getQueue(filters: QueueFilters = {}) {
  const { department, status, date, priority } = filters;

  // Build date range for today (or specified date) in local timezone
  const targetDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  );
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  let query = supabase
    .from('queue')
    .select(
      `
      *,
      patient:patients(id, patient_id, first_name, surname, date_of_birth, gender),
      assigned_staff:staff!assigned_to(staff_id, first_name, last_name)
    `,
    )
    .gte('created_at', startOfDay.toISOString())
    .lt('created_at', endOfDay.toISOString())
    .order('priority', { ascending: false }) // Emergency first
    .order('created_at', { ascending: false }); // Most recent first

  const dbDepartment = department ? toDbQueueLocation(department) : null;

  if (dbDepartment) {
    query = query.eq('location', dbDepartment);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (priority) {
    query = query.eq('priority', priority);
  }

  const { data, error } = await query;

  if (error) throw error;
  return enrichQueueEntries(data as Record<string, any>[]);
}

/**
 * Get waiting queue for a department
 */
export async function getDepartmentWaitingQueue(department: Department) {
  // Build date range for today in local timezone
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dbDepartment = toDbQueueLocation(department);

  const { data, error } = await supabase
    .from('queue')
    .select(
      `
      *,
      patient:patients(id, patient_id, emr_number, first_name, surname, date_of_birth, gender),
      encounter:visits!queue_visit_id_fkey(id, encounter_number, visit_type, status)
    `,
    )
    .eq('location', dbDepartment)
    .in('status', ['Waiting', 'Ready_For_Consultation'])
    .gte('created_at', startOfDay.toISOString())
    .order('priority', { ascending: false })
    .order('ticket_number', { ascending: true });

  if (error) throw error;
  return enrichQueueEntries(data as Record<string, any>[]);
}

/**
 * Add patient to queue
 */
export async function addToQueue(data: CreateQueueDTO): Promise<QueueDTO> {
  const {
    patient_id,
    department,
    priority = 'Normal',
    notes,
    encounter_id,
    clinic_id,
  } = data;
  const dbDepartment = toDbQueueLocation(department);

  // Use atomic create_queue_ticket RPC for reliable ticket generation + queue insertion
  const { data: queueResult, error: rpcError } = await supabase.rpc(
    'create_queue_ticket',
    {
      p_dept: dbDepartment,
      p_patient_id: patient_id,
      p_visit_id: encounter_id,
      p_encounter_id: encounter_id,
      p_clinic_id: clinic_id,
      p_priority: priority,
      p_notes: notes,
    },
  );

  let queue: any = null;

  if (rpcError || !queueResult?.success) {
    // Fallback to direct insert if RPC doesn't exist or fails
    console.warn(
      '[Queue] Atomic create_queue_ticket failed, using fallback:',
      rpcError || queueResult?.error,
    );
    const fallbackTicket = Math.floor(Date.now() % 10000);

    const { data: fallbackQueue, error } = await supabase
      .from('queue')
      .insert({
        patient_id,
        visit_id: encounter_id,
        encounter_id,
        clinic_id,
        location: dbDepartment,
        ticket_number: fallbackTicket.toString(),
        priority,
        status: 'Waiting',
        notes,
      })
      .select(
        `
        *,
        patient:patients(id, patient_id, first_name, surname, date_of_birth, gender)
      `,
      )
      .single();

    if (error) throw error;
    queue = fallbackQueue;
  } else {
    // RPC succeeded - fetch the created queue entry
    const { data: createdQueue, error } = await supabase
      .from('queue')
      .select(
        `
        *,
        patient:patients(id, patient_id, first_name, surname, date_of_birth, gender)
      `,
      )
      .eq('id', queueResult.queue_id)
      .single();

    if (error) throw error;
    queue = createdQueue;
    console.log(
      `[Queue] Created queue entry with atomic ticket #${queueResult.ticket_number}`,
    );
  }

  const [entry] = await enrichQueueEntries(queue ? [queue] : []);
  if (!entry) {
    throw new Error('Failed to create queue entry');
  }
  return entry;
}

/**
 * Call next patient
 */
export async function callNextPatient(
  department: Department,
): Promise<QueueDTO | null> {
  // Build date range for today in local timezone
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dbDepartment = toDbQueueLocation(department);

  // Get next waiting patient (priority first, then queue number)
  const { data: nextPatient, error: fetchError } = await supabase
    .from('queue')
    .select(
      `
      *,
      patient:patients(id, patient_id, first_name, surname, date_of_birth, gender)
    `,
    )
    .eq('location', dbDepartment)
    .eq('status', 'Waiting')
    .gte('created_at', startOfDay.toISOString())
    .order('priority', { ascending: false })
    .order('ticket_number', { ascending: true })
    .limit(1)
    .single();

  if (fetchError || !nextPatient) return null;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let assignedTo = null;
  if (user) {
    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email)
      .maybeSingle();
    assignedTo = staffData?.id;
  }

  // Update status to Ready_For_Consultation
  const { data: updated, error } = await supabase
    .from('queue')
    .update({
      status: 'Ready_For_Consultation',
      called_at: new Date().toISOString(),
      assigned_to: assignedTo,
    })
    .eq('id', nextPatient.id)
    .select(
      `
      *,
      patient:patients(id, patient_id, first_name, surname, date_of_birth, gender)
    `,
    )
    .single();

  if (error) throw error;

  const [entry] = await enrichQueueEntries(updated ? [updated] : []);
  return entry || null;
}

/**
 * Update queue entry
 */
export async function updateQueueEntry(
  data: UpdateQueueDTO,
): Promise<QueueDTO> {
  const { id, ...updateData } = data;

  // Set completed_at if completing
  if (updateData.status === 'Completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data: queue, error } = await supabase
    .from('queue')
    .update(updateData)
    .eq('id', id)
    .select(
      `
      *,
      patient:patients(id, patient_id, first_name, surname, date_of_birth, gender)
    `,
    )
    .single();

  if (error) throw error;

  const [entry] = await enrichQueueEntries(queue ? [queue] : []);
  if (!entry) {
    throw new Error('Queue entry not found');
  }
  return entry;
}

/**
 * Start serving patient (In_Consultation)
 */
export async function startServing(id: string): Promise<QueueDTO> {
  return updateQueueEntry({
    id,
    status: 'In Progress',
    started_at: new Date().toISOString(),
  });
}

/**
 * Complete serving patient
 */
export async function completeServing(id: string): Promise<QueueDTO> {
  return updateQueueEntry({
    id,
    status: 'Completed',
    completed_at: new Date().toISOString(),
  });
}

/**
 * Mark as no show
 */
export async function markNoShow(id: string): Promise<QueueDTO> {
  return updateQueueEntry({
    id,
    status: 'No Show',
  });
}

/**
 * Transfer to another department
 */
export async function transferToDepartment(
  id: string,
  department: Department,
): Promise<QueueDTO> {
  // First complete current queue entry
  await completeServing(id);

  // Get the patient
  const { data: queueEntry } = await supabase
    .from('queue')
    .select('patient_id, visit_id, clinic_id')
    .eq('id', id)
    .single();

  if (!queueEntry) throw new Error('Queue entry not found');

  // Add to new department
  return addToQueue({
    patient_id: queueEntry.patient_id,
    encounter_id: queueEntry.visit_id,
    clinic_id: queueEntry.clinic_id,
    department,
  });
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<QueueStats> {
  // Build date range for today in local timezone
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today = startOfDay.toISOString();

  // Waiting (Total)
  const { count: waiting } = await supabase
    .from('queue')
    .select('*', { count: 'exact', head: true })
    .in('status', ['Waiting', 'Ready_For_Consultation'])
    .gte('created_at', today);

  // Ready For Consultation
  const { count: readyForConsultation } = await supabase
    .from('queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Ready_For_Consultation')
    .gte('created_at', today);

  // In progress
  const { count: inProgress } = await supabase
    .from('queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'In Progress')
    .gte('created_at', today);

  // Completed today
  const { count: completed } = await supabase
    .from('queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Completed')
    .gte('created_at', today);

  // Skipped
  const { count: skipped } = await supabase
    .from('queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Skipped')
    .gte('created_at', today);

  // No shows
  const { count: noShows } = await supabase
    .from('queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'No Show')
    .gte('created_at', today);

  // Priority counts (Waiting only)
  const { count: emergency } = await supabase
    .from('queue')
    .select('*', { count: 'exact', head: true })
    .eq('priority', 'Emergency')
    .in('status', ['Waiting', 'Ready_For_Consultation'])
    .gte('created_at', today);

  const { count: urgent } = await supabase
    .from('queue')
    .select('*', { count: 'exact', head: true })
    .eq('priority', 'Urgent')
    .in('status', ['Waiting', 'Ready_For_Consultation'])
    .gte('created_at', today);

  const { count: normal } = await supabase
    .from('queue')
    .select('*', { count: 'exact', head: true })
    .eq('priority', 'Normal')
    .in('status', ['Waiting', 'Ready_For_Consultation'])
    .gte('created_at', today);

  return {
    waiting: waiting || 0,
    ready_for_consultation: readyForConsultation || 0,
    in_progress: inProgress || 0,
    completed_today: completed || 0,
    skipped: skipped || 0,
    average_wait_time: '15 min', // Placeholder
    emergency_waiting: emergency || 0,
    urgent_waiting: urgent || 0,
    normal_waiting: normal || 0,
    longest_wait: '0 min', // Placeholder
    no_shows: noShows || 0,
  };
}

/**
 * Get department queue summaries
 */
export async function getDepartmentQueues(): Promise<DepartmentQueue[]> {
  // Build date range for today in local timezone
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const results: DepartmentQueue[] = [];

  for (const department of DEPARTMENTS) {
    const dbDepartment = toDbQueueLocation(department);
    const { data } = await supabase
      .from('queue')
      .select('status, ticket_number')
      .eq('location', dbDepartment)
      .gte('created_at', startOfDay.toISOString());

    const waiting =
      data?.filter(
        (q) => q.status === 'Waiting' || q.status === 'Ready_For_Consultation',
      ).length || 0;
    const inProgress =
      data?.filter((q) => q.status === 'In Progress').length || 0;
    const currentInProgress = data?.find(
      (q) =>
        q.status === 'In Progress' || q.status === 'Ready_For_Consultation',
    );

    results.push({
      department,
      waiting,
      in_progress: inProgress,
      current_number: currentInProgress?.ticket_number || null,
    });
  }

  return results;
}

/**
 * Get current called number for display
 */
export async function getCurrentCalledNumber(
  department: Department,
): Promise<string | null> {
  // Build date range for today in local timezone
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dbDepartment = toDbQueueLocation(department);

  const { data } = await supabase
    .from('queue')
    .select('ticket_number')
    .eq('location', dbDepartment)
    .in('status', ['Ready_For_Consultation', 'In Progress'])
    .gte('created_at', startOfDay.toISOString())
    .order('called_at', { ascending: false })
    .limit(1)
    .single();

  return data?.ticket_number || null;
}
