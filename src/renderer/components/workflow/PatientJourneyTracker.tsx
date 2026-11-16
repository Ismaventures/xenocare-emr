// =============================================================================
// Patient Journey Tracker Component
// Shows the current status of a patient's encounter through the workflow
// =============================================================================

import React from 'react';
import {
  CheckCircle,
  Circle,
  Clock,
  ClipboardList,
  CreditCard,
  Stethoscope,
  FlaskConical,
  Scan,
  Pill,
  Receipt,
  Users,
  Activity,
  ArrowRight,
  Syringe,
  // Specialty icons
  Smile, // Dental
  Eye, // Ophthalmology
  Dumbbell, // Physiotherapy
} from 'lucide-react';
import {
  EncounterDTO,
  WorkflowStage,
  WORKFLOW_STAGES,
  getStageDisplayName,
  getStageColor,
} from '../../lib/workflow';

interface PatientJourneyTrackerProps {
  encounter: EncounterDTO;
  compact?: boolean;
}

const STAGE_ICONS: Record<
  WorkflowStage,
  React.ComponentType<{ className?: string }>
> = {
  registration: ClipboardList,
  payment: CreditCard,
  queue_waiting: Users,
  nursing_vitals: Activity,
  consultation: Stethoscope,
  lab_pending: FlaskConical,
  lab_results: FlaskConical,
  radiology_pending: Scan,
  radiology_results: Scan,
  procedure_pending: Syringe,
  doctor_review: Stethoscope,
  pharmacy_pending: Pill,
  pharmacy_dispense: Pill,
  billing_final: Receipt,
  completed: CheckCircle,
  // Specialty module stages
  dental_pending: Smile,
  dental_exam: Smile,
  dental_procedure: Smile,
  ophthalmology_pending: Eye,
  ophthalmology_exam: Eye,
  ophthalmology_procedure: Eye,
  physiotherapy_pending: Dumbbell,
  physiotherapy_assessment: Dumbbell,
  physiotherapy_session: Dumbbell,
};

// Define the main workflow path for display
const MAIN_WORKFLOW_PATH: WorkflowStage[] = [
  'registration',
  'payment',
  'queue_waiting',
  'nursing_vitals',
  'consultation',
  'lab_pending',
  'pharmacy_pending',
  'billing_final',
  'completed',
];

export function PatientJourneyTracker({
  encounter,
  compact = false,
}: PatientJourneyTrackerProps) {
  const currentStage = encounter.current_stage;
  const currentStageIndex = MAIN_WORKFLOW_PATH.indexOf(currentStage);

  const getStageStatus = (stage: WorkflowStage) => {
    const stageIndex = MAIN_WORKFLOW_PATH.indexOf(stage);
    if (stage === currentStage) return 'current';
    if (stageIndex < currentStageIndex) return 'completed';
    return 'pending';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {MAIN_WORKFLOW_PATH.slice(0, 6).map((stage, index) => {
          const status = getStageStatus(stage);
          const Icon = STAGE_ICONS[stage];
          return (
            <React.Fragment key={stage}>
              <div
                className={`p-1.5 rounded-full ${
                  status === 'current'
                    ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-300'
                    : status === 'completed'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                }`}
                title={getStageDisplayName(stage)}
              >
                <Icon className="h-3 w-3" />
              </div>
              {index < 5 && (
                <div
                  className={`w-4 h-0.5 ${
                    status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Patient Journey
      </h3>

      {/* Current Stage Highlight */}
      <div className={`mb-6 p-4 rounded-lg ${getStageColor(currentStage)}`}>
        <div className="flex items-center gap-3">
          {React.createElement(STAGE_ICONS[currentStage], {
            className: 'h-6 w-6',
          })}
          <div>
            <p className="text-sm font-medium">Current Stage</p>
            <p className="text-lg font-bold">
              {getStageDisplayName(currentStage)}
            </p>
          </div>
        </div>
      </div>

      {/* Full Journey Timeline */}
      <div className="relative">
        <div className="space-y-4">
          {MAIN_WORKFLOW_PATH.map((stage, index) => {
            const status = getStageStatus(stage);
            const Icon = STAGE_ICONS[stage];
            const isLast = index === MAIN_WORKFLOW_PATH.length - 1;

            return (
              <div key={stage} className="flex items-start gap-4">
                {/* Icon and line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`p-2 rounded-full ${
                      status === 'current'
                        ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                        : status === 'completed'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 h-8 ${
                        status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>

                {/* Stage info */}
                <div className="flex-1 min-w-0 pb-4">
                  <p
                    className={`font-medium ${
                      status === 'current'
                        ? 'text-blue-600'
                        : status === 'completed'
                          ? 'text-green-600'
                          : 'text-gray-400'
                    }`}
                  >
                    {getStageDisplayName(stage)}
                  </p>
                  {status === 'current' && (
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-blue-500" />
                      <span className="text-xs text-blue-600">In Progress</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Encounter Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Visit Type</span>
            <p className="font-medium">{encounter.visit_type}</p>
          </div>
          <div>
            <span className="text-gray-500">Payment</span>
            <p className="font-medium">{encounter.payment_category}</p>
          </div>
          <div>
            <span className="text-gray-500">Priority</span>
            <p className="font-medium">{encounter.priority}</p>
          </div>
          <div>
            <span className="text-gray-500">Started</span>
            <p className="font-medium">
              {new Date(encounter.registration_time).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Mini Journey Badge - For list views
// =============================================================================

interface JourneyBadgeProps {
  stage: WorkflowStage;
}

export function JourneyBadge({ stage }: JourneyBadgeProps) {
  const Icon = STAGE_ICONS[stage];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStageColor(stage)}`}
    >
      <Icon className="h-3 w-3" />
      {getStageDisplayName(stage)}
    </span>
  );
}

// =============================================================================
// Workflow Action Buttons - Context-sensitive actions based on stage
// =============================================================================

interface WorkflowActionsProps {
  encounter: EncounterDTO;
  onTransition: (nextStage: WorkflowStage) => void;
  onComplete: () => void;
  isLoading?: boolean;
}

export function WorkflowActions({
  encounter,
  onTransition,
  onComplete,
  isLoading,
}: WorkflowActionsProps) {
  const { current_stage } = encounter;

  const getActions = (): {
    label: string;
    stage: WorkflowStage;
    variant: 'primary' | 'secondary';
  }[] => {
    switch (current_stage) {
      case 'payment':
        return [
          {
            label: 'Payment Received → Nursing',
            stage: 'queue_waiting',
            variant: 'primary',
          },
        ];
      case 'queue_waiting':
        return [
          {
            label: 'Start Vitals',
            stage: 'nursing_vitals',
            variant: 'primary',
          },
          {
            label: 'Skip to Consultation',
            stage: 'consultation',
            variant: 'secondary',
          },
        ];
      case 'nursing_vitals':
        return [
          {
            label: 'Vitals Complete → Consultation',
            stage: 'consultation',
            variant: 'primary',
          },
        ];
      case 'consultation':
        return [
          {
            label: 'Order Lab Tests',
            stage: 'lab_pending',
            variant: 'secondary',
          },
          {
            label: 'Order Imaging',
            stage: 'radiology_pending',
            variant: 'secondary',
          },
          {
            label: 'Prescribe Medication',
            stage: 'pharmacy_pending',
            variant: 'secondary',
          },
          {
            label: 'Complete Consultation',
            stage: 'billing_final',
            variant: 'primary',
          },
        ];
      case 'lab_results':
        return [
          {
            label: 'Doctor Review',
            stage: 'doctor_review',
            variant: 'primary',
          },
          {
            label: 'Order More Tests',
            stage: 'lab_pending',
            variant: 'secondary',
          },
        ];
      case 'radiology_results':
        return [
          {
            label: 'Doctor Review',
            stage: 'doctor_review',
            variant: 'primary',
          },
        ];
      case 'doctor_review':
        return [
          {
            label: 'Order Lab Tests',
            stage: 'lab_pending',
            variant: 'secondary',
          },
          {
            label: 'Order Imaging',
            stage: 'radiology_pending',
            variant: 'secondary',
          },
          {
            label: 'Prescribe Medication',
            stage: 'pharmacy_pending',
            variant: 'primary',
          },
          { label: 'Complete Visit', stage: 'completed', variant: 'primary' },
        ];
      case 'pharmacy_dispense':
        return [
          {
            label: 'Final Billing',
            stage: 'billing_final',
            variant: 'primary',
          },
        ];
      case 'billing_final':
        return [
          {
            label: 'Complete Encounter',
            stage: 'completed',
            variant: 'primary',
          },
        ];
      default:
        return [];
    }
  };

  const actions = getActions();

  if (actions.length === 0 || current_stage === 'completed') return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {actions.map((action) => (
        <button
          key={action.stage}
          onClick={() =>
            action.stage === 'completed'
              ? onComplete()
              : onTransition(action.stage)
          }
          disabled={isLoading}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            action.variant === 'primary'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <ArrowRight className="h-4 w-4" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
