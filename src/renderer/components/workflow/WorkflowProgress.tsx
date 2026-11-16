/**
 * Workflow Progress Component
 *
 * Visual indicator showing the current stage in the encounter workflow.
 * Displays all stages with the current stage highlighted and ownership info.
 */

import React from 'react';
import {
  Check,
  Circle,
  Clock,
  User,
  CreditCard,
  Activity,
  Users,
  Stethoscope,
  ClipboardList,
  FlaskConical,
  FileCheck,
  Lock,
} from 'lucide-react';
import {
  WorkflowStage,
  getStageDisplayName,
  getStageColor,
  getStageOwnership,
  getStageOwnerColor,
  StageOwner,
} from '../../lib/workflow';

interface WorkflowProgressProps {
  currentStage: string;
  stageHistory?: Array<{
    stage: string;
    timestamp: string;
    performed_by?: string;
  }>;
  compact?: boolean;
  showOwnership?: boolean;
}

// Stage icon mapping
const getStageIcon = (stage: string) => {
  const icons: Record<string, React.ElementType> = {
    registered: User,
    encounter_created: ClipboardList,
    awaiting_consultation_payment: CreditCard,
    paid: Check,
    waived: Check,
    vitals_taken: Activity,
    in_queue: Users,
    in_consultation: Stethoscope,
    treatment_plan_created: ClipboardList,
    services_requested: FlaskConical,
    services_completed: FileCheck,
    encounter_closed: Lock,
  };
  return icons[stage] || Circle;
};

// Main workflow stages in order
const MAIN_STAGES: string[] = [
  'registered',
  'encounter_created',
  'awaiting_consultation_payment',
  'paid',
  'vitals_taken',
  'in_queue',
  'in_consultation',
  'treatment_plan_created',
  'services_requested',
  'services_completed',
  'encounter_closed',
];

// Get stage index for progress calculation
const getStageIndex = (stage: string): number => {
  // Map alternative stages
  if (stage === 'waived') return MAIN_STAGES.indexOf('paid');
  return MAIN_STAGES.indexOf(stage);
};

// Check if stage is completed
const isStageCompleted = (stage: string, currentStage: string): boolean => {
  const currentIndex = getStageIndex(currentStage);
  const stageIndex = getStageIndex(stage);
  return stageIndex < currentIndex;
};

// Check if stage is current
const isStageCurrent = (stage: string, currentStage: string): boolean => {
  if (stage === 'paid' && currentStage === 'waived') return true;
  return stage === currentStage;
};

// Compact horizontal progress bar
const CompactProgress: React.FC<WorkflowProgressProps> = ({
  currentStage,
  showOwnership,
}) => {
  const currentIndex = getStageIndex(currentStage);
  const progressPercent = Math.round(
    (currentIndex / (MAIN_STAGES.length - 1)) * 100,
  );
  const stageAsWorkflowStage = currentStage as WorkflowStage;
  const ownership = getStageOwnership(stageAsWorkflowStage);
  const stageColor = getStageColor(stageAsWorkflowStage);

  return (
    <div className="bg-white rounded-lg p-3 border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${stageColor}`}
          >
            {getStageDisplayName(stageAsWorkflowStage)}
          </span>
          {showOwnership && (
            <span className={`text-xs ${getStageOwnerColor(ownership.owner)}`}>
              {ownership.owner}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {progressPercent}% complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stage markers */}
      <div className="flex justify-between mt-2">
        {MAIN_STAGES.slice(0, 6).map((stage, index) => {
          const isCompleted = isStageCompleted(stage, currentStage);
          const isCurrent = isStageCurrent(stage, currentStage);
          const Icon = getStageIcon(stage);

          return (
            <div
              key={stage}
              className={`flex flex-col items-center ${index === 0 ? '' : ''}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Full vertical timeline
const FullProgress: React.FC<WorkflowProgressProps> = ({
  currentStage,
  stageHistory,
  showOwnership = true,
}) => {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Encounter Journey
      </h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Stages */}
        <div className="space-y-4">
          {MAIN_STAGES.map((stage, index) => {
            const isCompleted = isStageCompleted(stage, currentStage);
            const isCurrent = isStageCurrent(stage, currentStage);
            const Icon = getStageIcon(stage);
            const stageAsWorkflowStage = stage as WorkflowStage;
            const ownership = getStageOwnership(stageAsWorkflowStage);
            const stageColor = getStageColor(stageAsWorkflowStage);

            // Find history entry for this stage
            const historyEntry = stageHistory?.find((h) => h.stage === stage);

            return (
              <div key={stage} className="relative flex items-start gap-3 pl-1">
                {/* Stage indicator */}
                <div
                  className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? `${stageColor} ring-2 ring-offset-2 ring-green-500`
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                {/* Stage content */}
                <div
                  className={`flex-1 pb-4 ${isCurrent ? 'opacity-100' : isCompleted ? 'opacity-80' : 'opacity-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${isCurrent ? 'text-gray-900' : 'text-gray-700'}`}
                    >
                      {getStageDisplayName(stageAsWorkflowStage)}
                    </span>
                    {historyEntry && (
                      <span className="text-xs text-gray-400">
                        {new Date(historyEntry.timestamp).toLocaleTimeString(
                          'en-GB',
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )}
                      </span>
                    )}
                  </div>

                  {showOwnership && (
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs ${getStageOwnerColor(ownership.owner)}`}
                      >
                        {ownership.owner}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">
                        {ownership.department}
                      </span>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <Clock className="w-3 h-3 animate-pulse" />
                      <span>In progress...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const WorkflowProgress: React.FC<WorkflowProgressProps> = (props) => {
  if (props.compact) {
    return <CompactProgress {...props} />;
  }
  return <FullProgress {...props} />;
};

// Stage badge component for inline use
export const StageBadge: React.FC<{ stage: string; showOwner?: boolean }> = ({
  stage,
  showOwner = false,
}) => {
  const stageAsWorkflowStage = stage as WorkflowStage;
  const stageColor = getStageColor(stageAsWorkflowStage);
  const ownership = getStageOwnership(stageAsWorkflowStage);
  const Icon = getStageIcon(stage);

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${stageColor}`}
      >
        <Icon className="w-3 h-3" />
        {getStageDisplayName(stageAsWorkflowStage)}
      </span>
      {showOwner && (
        <span className={`text-xs ${getStageOwnerColor(ownership.owner)}`}>
          ({ownership.owner})
        </span>
      )}
    </div>
  );
};

// Progress percentage component
export const ProgressPercentage: React.FC<{ currentStage: string }> = ({
  currentStage,
}) => {
  const currentIndex = getStageIndex(currentStage);
  const progressPercent = Math.round(
    (currentIndex / (MAIN_STAGES.length - 1)) * 100,
  );

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <span className="text-xs text-gray-600">{progressPercent}%</span>
    </div>
  );
};

export default WorkflowProgress;
