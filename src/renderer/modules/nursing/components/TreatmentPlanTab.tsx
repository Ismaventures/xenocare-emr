/**
 * Treatment Plan Tab Component
 *
 * Read-only view for nurses to see doctor's treatment plans.
 * Reuses existing treatment-plan API functions.
 *
 * Nurses CAN:
 * - View treatment plans
 * - Mark plans as viewed
 * - Update task status (execute/complete tasks)
 * - Add execution notes
 *
 * Nurses CANNOT:
 * - Create treatment plans
 * - Edit plan details
 * - Delete plans
 */

import React, { useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Play,
  Eye,
  FileText,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Select,
  Input,
  Card,
  StatusBadge,
  EmptyState,
} from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';

// Import from existing treatment-plan module (REUSE!)
import {
  getNurseTreatmentPlans,
  getTreatmentPlans,
  markPlanViewed,
  completeTask,
  startTask,
} from '../../treatment-plan/api/treatment-plan.api';
import {
  TreatmentPlanDTO,
  TreatmentTaskDTO,
  TreatmentPlanStatus,
  TreatmentTaskStatus,
  TREATMENT_PLAN_STATUS,
  TREATMENT_TASK_STATUS,
} from '../../treatment-plan/dtos/treatment-plan.dto';

// =============================================================================
// Types
// =============================================================================

interface TreatmentPlanTabProps {
  encounterId?: string;
  patientId?: string;
}

// =============================================================================
// Sub-Components
// =============================================================================

function TaskStatusIcon({ status }: { status: TreatmentTaskStatus }) {
  switch (status) {
    case 'Completed':
      return <CheckCircle2 size={18} className="text-green-500" />;
    case 'In_Progress':
      return <Play size={18} className="text-blue-500" />;
    case 'Pending':
      return <Circle size={18} className="text-gray-400" />;
    case 'Skipped':
      return <Circle size={18} className="text-gray-300 line-through" />;
    case 'Escalated':
      return <AlertTriangle size={18} className="text-orange-500" />;
    default:
      return <Circle size={18} className="text-gray-400" />;
  }
}

function PlanStatusBadge({ status }: { status: TreatmentPlanStatus }) {
  const variants: Record<
    TreatmentPlanStatus,
    'info' | 'warning' | 'success' | 'danger' | 'neutral'
  > = {
    Created: 'info',
    Viewed: 'info',
    In_Progress: 'warning',
    Completed: 'success',
    Cancelled: 'danger',
  };

  return (
    <StatusBadge
      status={status.replace('_', ' ')}
      variant={variants[status] || 'neutral'}
    />
  );
}

interface TaskItemProps {
  task: TreatmentTaskDTO;
  onStartTask: (taskId: string) => void;
  onCompleteTask: (taskId: string, notes: string) => void;
  isUpdating: boolean;
}

function TaskItem({
  task,
  onStartTask,
  onCompleteTask,
  isUpdating,
}: TaskItemProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [executionNotes, setExecutionNotes] = useState('');

  const canStart = task.status === 'Pending';
  const canComplete = task.status === 'In_Progress';
  const isCompleted = task.status === 'Completed' || task.status === 'Skipped';

  return (
    <div
      className={`p-3 rounded-lg border ${isCompleted ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}
    >
      <div className="flex items-start gap-3">
        <TaskStatusIcon status={task.status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}
            >
              {task.title}
            </span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
              {task.task_type.replace('_', ' ')}
            </span>
            {task.priority === 'Urgent' && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">
                Urgent
              </span>
            )}
            {task.priority === 'Emergency' && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                Emergency
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
          )}

          {task.instructions && (
            <p className="text-sm text-blue-600 mt-1 italic">
              📋 {task.instructions}
            </p>
          )}

          {task.medication_name && (
            <p className="text-sm text-purple-600 mt-1">
              💊 {task.medication_name} - {task.dosage} ({task.route})
            </p>
          )}

          {task.scheduled_time && (
            <p className="text-xs text-gray-500 mt-1">
              <Clock size={12} className="inline mr-1" />
              Scheduled: {new Date(task.scheduled_time).toLocaleTimeString()}
            </p>
          )}

          {task.execution_notes && (
            <p className="text-sm text-green-700 mt-2 bg-green-50 p-2 rounded">
              ✅ {task.execution_notes}
            </p>
          )}

          {/* Action buttons for nurses */}
          {!isCompleted && (
            <div className="mt-3 flex items-center gap-2">
              {canStart && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onStartTask(task.task_id)}
                  disabled={isUpdating}
                >
                  <Play size={14} className="mr-1" />
                  Start Task
                </Button>
              )}

              {canComplete && (
                <>
                  {!showNotes ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setShowNotes(true)}
                      disabled={isUpdating}
                    >
                      <CheckCircle2 size={14} className="mr-1" />
                      Complete Task
                    </Button>
                  ) : (
                    <div className="flex-1 space-y-2">
                      <textarea
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Add execution notes (optional)..."
                        value={executionNotes}
                        onChange={(e) => setExecutionNotes(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            onCompleteTask(task.task_id, executionNotes);
                            setShowNotes(false);
                            setExecutionNotes('');
                          }}
                          disabled={isUpdating}
                        >
                          Confirm Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowNotes(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PlanCardProps {
  plan: TreatmentPlanDTO;
  onMarkViewed: (planId: string) => void;
  onStartTask: (taskId: string) => void;
  onCompleteTask: (taskId: string, notes: string) => void;
  isUpdating: boolean;
}

function PlanCard({
  plan,
  onMarkViewed,
  onStartTask,
  onCompleteTask,
  isUpdating,
}: PlanCardProps) {
  const [isExpanded, setIsExpanded] = useState(plan.status !== 'Completed');

  const completedTasks =
    plan.tasks?.filter((t) => t.status === 'Completed').length || 0;
  const totalTasks = plan.tasks?.length || 0;
  const progress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const needsViewing = plan.status === 'Created';

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <ClipboardList size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{plan.title}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <User size={14} />
                  {plan.patient?.first_name} {plan.patient?.surname}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(plan.created_at).toLocaleDateString()}
                </span>
                {plan.creator && <span>Dr. {plan.creator.last_name}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <PlanStatusBadge status={plan.status} />
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>

        {/* Progress bar */}
        {totalTasks > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>
                {completedTasks}/{totalTasks} tasks ({progress}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          {/* Mark as viewed button */}
          {needsViewing && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700">
                <Eye size={18} />
                <span className="text-sm font-medium">
                  This plan requires acknowledgement
                </span>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkViewed(plan.plan_id);
                }}
                disabled={isUpdating}
              >
                Mark as Viewed
              </Button>
            </div>
          )}

          {/* Instructions */}
          {plan.instructions && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="text-sm font-medium text-amber-800 mb-1">
                📋 Doctor's Instructions
              </h4>
              <p className="text-sm text-amber-700">{plan.instructions}</p>
            </div>
          )}

          {/* Description */}
          {plan.description && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                Description
              </h4>
              <p className="text-sm text-gray-600">{plan.description}</p>
            </div>
          )}

          {/* Tasks */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Tasks ({totalTasks})
            </h4>

            {plan.tasks && plan.tasks.length > 0 ? (
              <div className="space-y-2">
                {plan.tasks
                  .sort((a, b) => a.sequence_order - b.sequence_order)
                  .map((task) => (
                    <TaskItem
                      key={task.task_id}
                      task={task}
                      onStartTask={onStartTask}
                      onCompleteTask={onCompleteTask}
                      isUpdating={isUpdating}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No tasks defined</p>
            )}
          </div>

          {/* Completion notes */}
          {plan.completion_notes && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-1">
                ✅ Completion Notes
              </h4>
              <p className="text-sm text-green-700">{plan.completion_notes}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function TreatmentPlanTab({
  encounterId,
  patientId,
}: TreatmentPlanTabProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<TreatmentPlanStatus | ''>(
    '',
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Query: Get treatment plans for nurses
  const {
    data: plans,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['treatment-plans', 'nurse', encounterId, patientId],
    queryFn: async () => {
      if (encounterId) {
        return getTreatmentPlans({ encounter_id: encounterId });
      }
      if (patientId) {
        return getTreatmentPlans({ patient_id: patientId });
      }
      return getNurseTreatmentPlans();
    },
    staleTime: 30000,
  });

  // Mutation: Mark plan as viewed
  const markViewedMutation = useMutation({
    mutationFn: markPlanViewed,
    onSuccess: () => {
      showToast({
        type: 'success',
        title: 'Plan Acknowledged',
        message: 'Treatment plan marked as viewed',
      });
      queryClient.invalidateQueries({ queryKey: ['treatment-plans'] });
    },
    onError: () => {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to mark plan as viewed',
      });
    },
  });

  // Mutation: Start task
  const startTaskMutation = useMutation({
    mutationFn: startTask,
    onSuccess: () => {
      showToast({
        type: 'success',
        title: 'Task Started',
        message: 'Task is now in progress',
      });
      queryClient.invalidateQueries({ queryKey: ['treatment-plans'] });
    },
    onError: () => {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to start task',
      });
    },
  });

  // Mutation: Complete task
  const completeTaskMutation = useMutation({
    mutationFn: ({ taskId, notes }: { taskId: string; notes: string }) =>
      completeTask({ task_id: taskId, execution_notes: notes }),
    onSuccess: () => {
      showToast({
        type: 'success',
        title: 'Task Completed',
        message: 'Task marked as complete',
      });
      queryClient.invalidateQueries({ queryKey: ['treatment-plans'] });
    },
    onError: () => {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to complete task',
      });
    },
  });

  const isUpdating =
    markViewedMutation.isPending ||
    startTaskMutation.isPending ||
    completeTaskMutation.isPending;

  // Filter plans
  const filteredPlans = (plans || []).filter((plan) => {
    if (statusFilter && plan.status !== statusFilter) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const matchesTitle = plan.title.toLowerCase().includes(search);
      const matchesPatient =
        `${plan.patient?.first_name} ${plan.patient?.surname}`
          .toLowerCase()
          .includes(search);
      if (!matchesTitle && !matchesPatient) return false;
    }
    return true;
  });

  // Stats
  const stats = {
    total: plans?.length || 0,
    pending:
      plans?.filter((p) => p.status === 'Created' || p.status === 'Viewed')
        .length || 0,
    inProgress: plans?.filter((p) => p.status === 'In_Progress').length || 0,
    completed: plans?.filter((p) => p.status === 'Completed').length || 0,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Treatment Plans
          </h2>
          <p className="text-sm text-gray-500">
            View and execute doctor's treatment orders
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          onClick={() => refetch()}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Plans</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
          <p className="text-sm text-blue-600">Pending</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <p className="text-2xl font-bold text-amber-600">
            {stats.inProgress}
          </p>
          <p className="text-sm text-amber-600">In Progress</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-sm text-green-600">Completed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as TreatmentPlanStatus | '')
            }
            className="w-40"
          >
            <option value="">All Status</option>
            {TREATMENT_PLAN_STATUS.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </div>
        <Input
          type="text"
          placeholder="Search plans..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64"
        />
      </div>

      {/* Plans List */}
      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="animate-spin h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Loading treatment plans...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No Treatment Plans"
          description={
            encounterId || patientId
              ? 'No treatment plans found for this patient/encounter'
              : 'No active treatment plans requiring nursing attention'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredPlans.map((plan) => (
            <PlanCard
              key={plan.plan_id}
              plan={plan}
              onMarkViewed={(planId) => markViewedMutation.mutate(planId)}
              onStartTask={(taskId) => startTaskMutation.mutate(taskId)}
              onCompleteTask={(taskId, notes) =>
                completeTaskMutation.mutate({ taskId, notes })
              }
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}
    </div>
  );
}
