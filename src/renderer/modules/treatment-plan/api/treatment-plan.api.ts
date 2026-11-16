/**
 * Treatment Plan API
 *
 * Handles CRUD operations for treatment plans and tasks.
 * Based on EMR Workflow Reference document.
 */

import { supabase } from '../../../api/supabaseClient';
import {
  TreatmentPlanDTO,
  TreatmentTaskDTO,
  CreateTreatmentPlanDTO,
  CreateTreatmentTaskDTO,
  UpdateTreatmentPlanDTO,
  UpdateTreatmentTaskDTO,
  ExecuteTaskDTO,
  EscalateTaskDTO,
  TreatmentPlanStatus,
  TreatmentTaskStatus,
} from '../dtos/treatment-plan.dto';

// =============================================================================
// Treatment Plan CRUD
// =============================================================================

/** * Transform database row to DTO format
 * Database uses 'id', DTOs use 'plan_id' and 'task_id' for clarity
 */
function transformPlanToDTO(plan: any): TreatmentPlanDTO {
  return {
    ...plan,
    plan_id: plan.id || plan.plan_id,
    tasks: plan.tasks?.map((task: any) => ({
      ...task,
      task_id: task.id || task.task_id,
    })),
  };
}

/** * Get treatment plans with optional filters
 */
export async function getTreatmentPlans(
  filters: {
    encounter_id?: string;
    patient_id?: string;
    status?: TreatmentPlanStatus;
    created_by?: string;
  } = {},
): Promise<TreatmentPlanDTO[]> {
  let query = supabase
    .from('treatment_plans')
    .select(
      `
      *,
      tasks:treatment_tasks(*),
      patient:patients(patient_id, first_name, surname, emr_number),
      creator:staff!treatment_plans_created_by_fkey(staff_id, first_name, last_name)
    `,
    )
    .order('created_at', { ascending: false });

  if (filters.encounter_id) {
    query = query.eq('encounter_id', filters.encounter_id);
  }

  if (filters.patient_id) {
    query = query.eq('patient_id', filters.patient_id);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.created_by) {
    query = query.eq('created_by', filters.created_by);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).map(transformPlanToDTO);
}

/**
 * Get a single treatment plan by ID
 */
export async function getTreatmentPlanById(
  planId: string,
): Promise<TreatmentPlanDTO> {
  const { data, error } = await supabase
    .from('treatment_plans')
    .select(
      `
      *,
      tasks:treatment_tasks(*),
      patient:patients(patient_id, first_name, surname, emr_number),
      creator:staff!treatment_plans_created_by_fkey(staff_id, first_name, last_name)
    `,
    )
    .eq('id', planId)
    .single();

  if (error) throw error;
  return transformPlanToDTO(data);
}

/**
 * Get treatment plans for nurse dashboard (pending/in-progress)
 */
export async function getNurseTreatmentPlans(): Promise<TreatmentPlanDTO[]> {
  const { data, error } = await supabase
    .from('treatment_plans')
    .select(
      `
      *,
      tasks:treatment_tasks(*),
      patient:patients(patient_id, first_name, surname, emr_number),
      creator:staff!treatment_plans_created_by_fkey(staff_id, first_name, last_name)
    `,
    )
    .in('status', ['Created', 'Viewed', 'In_Progress'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(transformPlanToDTO);
}

/**
 * Create a new treatment plan with tasks
 */
export async function createTreatmentPlan(
  data: CreateTreatmentPlanDTO,
): Promise<TreatmentPlanDTO> {
  // Get current user's staff UUID (id) - treatment_plans.created_by references staff(id) which is UUID
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: staffData } = await supabase
    .from('staff')
    .select('id, staff_id, first_name, last_name')
    .eq('email', user.email)
    .single();

  if (!staffData) throw new Error('Staff record not found');

  const { tasks, ...planData } = data;

  // Create the treatment plan - use staff UUID (id), not staff_id VARCHAR
  const { data: plan, error: planError } = await supabase
    .from('treatment_plans')
    .insert({
      ...planData,
      status: 'Created',
      created_by: staffData.id,
    })
    .select()
    .single();

  if (planError) throw planError;

  // Create tasks if provided
  if (tasks && tasks.length > 0) {
    // Only include columns that exist in treatment_tasks table:
    // id, plan_id, encounter_id, patient_id, task_type, description, status,
    // scheduled_at, completed_at, completed_by, notes, result_value, created_at, updated_at
    const planUuid = plan.plan_id || plan.id; // Handle either schema version

    const tasksWithIds = tasks.map((task) => {
      // Build description from task details (medication info, instructions, etc.)
      let fullDescription = task.description || '';
      if (task.medication_name) {
        fullDescription = `${task.medication_name}`;
        if (task.dosage) fullDescription += ` - ${task.dosage}`;
        if (task.route) fullDescription += ` (${task.route})`;
        if (task.frequency) fullDescription += ` - ${task.frequency}`;
        if (task.description) fullDescription += `\n${task.description}`;
      }
      if (task.instructions) {
        fullDescription += fullDescription
          ? `\nInstructions: ${task.instructions}`
          : task.instructions;
      }

      return {
        plan_id: planUuid,
        encounter_id: data.encounter_id,
        patient_id: data.patient_id,
        task_type: task.task_type,
        description: fullDescription || task.title || 'Task',
        status: 'Pending',
        scheduled_at: task.scheduled_time || task.due_time || null,
        notes: task.priority ? `Priority: ${task.priority}` : null,
      };
    });

    const { error: tasksError } = await supabase
      .from('treatment_tasks')
      .insert(tasksWithIds);

    if (tasksError) throw tasksError;
  }

  // Create notification for nurses (triggered by database trigger)
  // The notify_treatment_plan_created() trigger will handle this automatically
  // when the plan is inserted

  // Fetch the complete plan with tasks
  const planId = plan.plan_id || plan.id;
  return getTreatmentPlanById(planId);
}

/**
 * Update a treatment plan
 */
export async function updateTreatmentPlan(
  data: UpdateTreatmentPlanDTO,
): Promise<TreatmentPlanDTO> {
  const { plan_id, ...updateData } = data;

  // Get current user if completing - use staff UUID (id), not staff_id VARCHAR
  if (updateData.status === 'Completed') {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, staff_id')
        .eq('email', user.email)
        .single();

      if (staffData) {
        (updateData as Record<string, unknown>).completed_by = staffData.id;
        (updateData as Record<string, unknown>).completed_at =
          new Date().toISOString();
      }
    }
  }

  const { error } = await supabase
    .from('treatment_plans')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', plan_id);

  if (error) throw error;
  return getTreatmentPlanById(plan_id);
}

/**
 * Mark treatment plan as viewed by nurse
 */
export async function markPlanViewed(
  planId: string,
): Promise<TreatmentPlanDTO> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: staffData } = await supabase
    .from('staff')
    .select('id, staff_id')
    .eq('email', user.email)
    .single();

  const { error } = await supabase
    .from('treatment_plans')
    .update({
      status: 'Viewed',
      viewed_by: staffData?.id,
      viewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .eq('status', 'Created'); // Only if not already viewed

  if (error) throw error;
  return getTreatmentPlanById(planId);
}

/**
 * Cancel a treatment plan
 */
export async function cancelTreatmentPlan(
  planId: string,
  reason: string,
): Promise<TreatmentPlanDTO> {
  return updateTreatmentPlan({
    plan_id: planId,
    status: 'Cancelled',
    completion_notes: `Cancelled: ${reason}`,
  });
}

// =============================================================================
// Treatment Task CRUD
// =============================================================================

/**
 * Transform database task row to DTO format
 */
function transformTaskToDTO(task: any): TreatmentTaskDTO {
  return {
    ...task,
    task_id: task.id || task.task_id,
  };
}

/**
 * Get tasks for a treatment plan
 */
export async function getTreatmentTasks(
  planId: string,
): Promise<TreatmentTaskDTO[]> {
  const { data, error } = await supabase
    .from('treatment_tasks')
    .select('*')
    .eq('plan_id', planId)
    .order('sequence_order', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformTaskToDTO);
}

/**
 * Get pending tasks for a nurse (across all plans)
 */
export async function getPendingNurseTasks(): Promise<TreatmentTaskDTO[]> {
  const { data, error } = await supabase
    .from('treatment_tasks')
    .select(
      `
      *,
      plan:treatment_plans(title, patient:patients(first_name, surname, emr_number))
    `,
    )
    .in('status', ['Pending', 'In_Progress'])
    .order('priority', { ascending: false })
    .order('scheduled_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(transformTaskToDTO);
}

/**
 * Add a task to an existing plan
 */
export async function addTaskToPlan(
  planId: string,
  task: CreateTreatmentTaskDTO,
): Promise<TreatmentTaskDTO> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: staffData } = await supabase
    .from('staff')
    .select('staff_id')
    .eq('email', user.email)
    .single();

  // Get plan info
  const { data: plan } = await supabase
    .from('treatment_plans')
    .select('encounter_id, patient_id')
    .eq('id', planId)
    .single();

  if (!plan) throw new Error('Treatment plan not found');

  // Get max sequence order
  const { data: maxOrder } = await supabase
    .from('treatment_tasks')
    .select('sequence_order')
    .eq('plan_id', planId)
    .order('sequence_order', { ascending: false })
    .limit(1)
    .single();

  const { data: newTask, error } = await supabase
    .from('treatment_tasks')
    .insert({
      ...task,
      plan_id: planId,
      encounter_id: plan.encounter_id,
      patient_id: plan.patient_id,
      status: 'Pending',
      priority: task.priority || 'Normal',
      sequence_order: (maxOrder?.sequence_order ?? -1) + 1,
    })
    .select()
    .single();

  if (error) throw error;
  return transformTaskToDTO(newTask);
}

/**
 * Start executing a task
 */
export async function startTask(taskId: string): Promise<TreatmentTaskDTO> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staffData } = await supabase
    .from('staff')
    .select('id, staff_id')
    .eq('email', user?.email)
    .single();

  const { data, error } = await supabase
    .from('treatment_tasks')
    .update({
      status: 'In_Progress',
      started_at: new Date().toISOString(),
      started_by: staffData?.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return transformTaskToDTO(data);
}

/**
 * Complete a task with notes
 */
export async function completeTask(
  data: ExecuteTaskDTO,
): Promise<TreatmentTaskDTO> {
  const { task_id, execution_notes, patient_response } = data;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staffData } = await supabase
    .from('staff')
    .select('id, staff_id')
    .eq('email', user?.email)
    .single();

  const { data: task, error } = await supabase
    .from('treatment_tasks')
    .update({
      status: 'Completed',
      completed_at: new Date().toISOString(),
      completed_by: staffData?.id,
      execution_notes,
      patient_response,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task_id)
    .select()
    .single();

  if (error) throw error;
  return transformTaskToDTO(task);
}

/**
 * Skip a task with reason
 */
export async function skipTask(
  taskId: string,
  reason: string,
): Promise<TreatmentTaskDTO> {
  const { data, error } = await supabase
    .from('treatment_tasks')
    .update({
      status: 'Skipped',
      execution_notes: `Skipped: ${reason}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return transformTaskToDTO(data);
}

/**
 * Escalate a task to a doctor
 */
export async function escalateTask(
  data: EscalateTaskDTO,
): Promise<TreatmentTaskDTO> {
  const { task_id, reason, escalate_to } = data;

  const { data: task, error } = await supabase
    .from('treatment_tasks')
    .update({
      status: 'Escalated',
      escalation_reason: reason,
      escalated_to: escalate_to,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task_id)
    .select()
    .single();

  if (error) throw error;
  return transformTaskToDTO(task);
}

/**
 * Update a task
 */
export async function updateTask(
  data: UpdateTreatmentTaskDTO,
): Promise<TreatmentTaskDTO> {
  const { task_id, ...updateData } = data;

  const { data: task, error } = await supabase
    .from('treatment_tasks')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task_id)
    .select()
    .single();

  if (error) throw error;
  return transformTaskToDTO(task);
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get treatment plan statistics
 */
export async function getTreatmentPlanStats(): Promise<{
  total_plans: number;
  pending_plans: number;
  in_progress_plans: number;
  completed_today: number;
  pending_tasks: number;
  overdue_tasks: number;
}> {
  const today = new Date().toISOString().split('T')[0];

  // Get plan counts by status
  const { count: totalPlans } = await supabase
    .from('treatment_plans')
    .select('*', { count: 'exact', head: true });

  const { count: pendingPlans } = await supabase
    .from('treatment_plans')
    .select('*', { count: 'exact', head: true })
    .in('status', ['Created', 'Viewed']);

  const { count: inProgressPlans } = await supabase
    .from('treatment_plans')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'In_Progress');

  const { count: completedToday } = await supabase
    .from('treatment_plans')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Completed')
    .gte('completed_at', today);

  // Get task counts
  const { count: pendingTasks } = await supabase
    .from('treatment_tasks')
    .select('*', { count: 'exact', head: true })
    .in('status', ['Pending', 'In_Progress']);

  const { count: overdueTasks } = await supabase
    .from('treatment_tasks')
    .select('*', { count: 'exact', head: true })
    .in('status', ['Pending', 'In_Progress'])
    .lt('due_time', new Date().toISOString());

  return {
    total_plans: totalPlans || 0,
    pending_plans: pendingPlans || 0,
    in_progress_plans: inProgressPlans || 0,
    completed_today: completedToday || 0,
    pending_tasks: pendingTasks || 0,
    overdue_tasks: overdueTasks || 0,
  };
}
