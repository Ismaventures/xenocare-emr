// =============================================================================
// Today's Encounters Dashboard Widget
// Shows real-time patient flow overview
// =============================================================================

import React from 'react';
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Activity,
  Stethoscope,
  FlaskConical,
  Pill,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  useActiveEncounters,
  useEncounterStats,
  EncounterDTO,
  WorkflowStage,
  getStageDisplayName,
} from '../../lib/workflow';
import { JourneyBadge } from './PatientJourneyTracker';

interface TodaysEncountersWidgetProps {
  onPatientClick?: (encounter: EncounterDTO) => void;
  onViewAll?: () => void;
}

export function TodaysEncountersWidget({
  onPatientClick,
  onViewAll,
}: TodaysEncountersWidgetProps) {
  const { data: encounters, isLoading, refetch } = useActiveEncounters();
  const { data: stats } = useEncounterStats();

  // Group encounters by stage
  const groupedEncounters = React.useMemo(() => {
    if (!encounters)
      return {} as Partial<Record<WorkflowStage, EncounterDTO[]>>;
    return encounters.reduce(
      (acc, enc) => {
        const stage = enc.current_stage;
        if (!acc[stage]) acc[stage] = [];
        acc[stage].push(enc);
        return acc;
      },
      {} as Partial<Record<WorkflowStage, EncounterDTO[]>>,
    );
  }, [encounters]);

  // Priority stages to show
  const priorityStages: WorkflowStage[] = [
    'payment',
    'queue_waiting',
    'nursing_vitals',
    'consultation',
    'lab_pending',
    'pharmacy_pending',
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Today's Patient Flow
          </h3>
          <p className="text-sm text-gray-500">Patient encounters for today</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {stats?.total_today || 0}
          </div>
          <div className="text-xs text-gray-500">Total Today</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {stats?.active || 0}
          </div>
          <div className="text-xs text-gray-500">Active</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats?.completed || 0}
          </div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-600">
            {stats?.average_duration_minutes || 0}m
          </div>
          <div className="text-xs text-gray-500">Avg Duration</div>
        </div>
      </div>

      {/* Stage Summary */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {priorityStages.map((stage) => {
          const stageEncounters = groupedEncounters[stage] || [];
          if (stageEncounters.length === 0) return null;

          return (
            <div key={stage} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <JourneyBadge stage={stage} />
                <span className="text-sm font-medium text-gray-600">
                  {stageEncounters.length} patient
                  {stageEncounters.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {stageEncounters.slice(0, 3).map((enc) => (
                  <button
                    key={enc.visit_id}
                    onClick={() => onPatientClick?.(enc)}
                    className="w-full flex items-center justify-between p-2 bg-white rounded border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-medium">
                        {enc.patient?.first_name?.charAt(0)}
                        {enc.patient?.surname?.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {enc.patient?.first_name} {enc.patient?.surname}
                        </span>
                        <p className="text-xs text-gray-500">
                          {enc.visit_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          enc.priority === 'Emergency'
                            ? 'bg-red-100 text-red-800'
                            : enc.priority === 'Urgent'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {enc.priority}
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                ))}
                {stageEncounters.length > 3 && (
                  <p className="text-xs text-gray-500 text-center py-1">
                    +{stageEncounters.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {(!encounters || encounters.length === 0) && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No active encounters today</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {onViewAll && (
        <div className="px-6 py-3 border-t border-gray-200">
          <button
            onClick={onViewAll}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All Encounters →
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Payment Queue Mini Widget
// =============================================================================

export function PaymentQueueWidget({
  onPaymentClick,
}: {
  onPaymentClick?: (encounter: EncounterDTO) => void;
}) {
  const { data: encounters } = useActiveEncounters();

  const paymentQueue = React.useMemo(() => {
    if (!encounters) return [];
    return encounters.filter((enc) => enc.current_stage === 'payment');
  }, [encounters]);

  if (paymentQueue.length === 0) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="h-5 w-5 text-yellow-600" />
        <h4 className="font-medium text-yellow-800">
          Awaiting Payment ({paymentQueue.length})
        </h4>
      </div>
      <div className="space-y-2">
        {paymentQueue.slice(0, 5).map((enc) => (
          <button
            key={enc.visit_id}
            onClick={() => onPaymentClick?.(enc)}
            className="w-full flex items-center justify-between p-2 bg-white rounded border border-yellow-100 hover:border-yellow-300 transition-colors text-left"
          >
            <span className="text-sm font-medium">
              {enc.patient?.first_name} {enc.patient?.surname}
            </span>
            <span className="text-xs text-yellow-600">
              {enc.payment_category}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Consultation Queue Widget
// =============================================================================

export function ConsultationQueueWidget({
  onPatientClick,
}: {
  onPatientClick?: (encounter: EncounterDTO) => void;
}) {
  const { data: encounters } = useActiveEncounters();

  const consultationQueue = React.useMemo(() => {
    if (!encounters) return [];
    return encounters
      .filter(
        (enc) =>
          enc.current_stage === 'queue_waiting' ||
          enc.current_stage === 'nursing_vitals',
      )
      .sort((a, b) => {
        // Priority sort: Emergency > Urgent > Normal
        const priorityOrder = { Emergency: 0, Urgent: 1, Normal: 2 };
        const priorityDiff =
          priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        // Then by registration time (Most recent first)
        return (
          new Date(b.registration_time).getTime() -
          new Date(a.registration_time).getTime()
        );
      });
  }, [encounters]);

  if (consultationQueue.length === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Stethoscope className="h-5 w-5 text-blue-600" />
        <h4 className="font-medium text-blue-800">
          Awaiting Consultation ({consultationQueue.length})
        </h4>
      </div>
      <div className="space-y-2">
        {consultationQueue.slice(0, 5).map((enc) => (
          <button
            key={enc.visit_id}
            onClick={() => onPatientClick?.(enc)}
            className="w-full flex items-center justify-between p-2 bg-white rounded border border-blue-100 hover:border-blue-300 transition-colors text-left"
          >
            <div>
              <span className="text-sm font-medium block">
                {enc.patient?.first_name} {enc.patient?.surname}
              </span>
              <span className="text-xs text-gray-500">{enc.visit_type}</span>
            </div>
            <JourneyBadge stage={enc.current_stage} />
          </button>
        ))}
      </div>
    </div>
  );
}
