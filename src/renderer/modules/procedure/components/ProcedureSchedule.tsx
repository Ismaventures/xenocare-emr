// =============================================================================
// NDC MEDICAL CENTRE EMR - Procedure Schedule Component
// Visual timeline/calendar view of scheduled procedures
// =============================================================================

import React from 'react';
import {
  Clock,
  User,
  Activity,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  XCircle,
} from 'lucide-react';
import type {
  Procedure,
  ProcedureStatus,
  ProcedurePriority,
  TodaysProcedureView,
} from '../../../types/database.types';

// Union type for procedures that can be displayed
type DisplayableProcedure = Procedure | TodaysProcedureView;

// Type guard to check if it's a TodaysProcedureView
function isTodaysProcedureView(
  p: DisplayableProcedure,
): p is TodaysProcedureView {
  return 'procedure_id' in p;
}

// Helper to get consistent properties from either type
function getProcedureId(p: DisplayableProcedure): string {
  return isTodaysProcedureView(p) ? p.procedure_id : p.id;
}

function getProcedureNumber(p: DisplayableProcedure): string {
  return p.procedure_number;
}

function getIndication(p: DisplayableProcedure): string | null {
  return isTodaysProcedureView(p)
    ? p.procedure_name
    : p.indication || p.procedure_name;
}

interface ProcedureScheduleProps {
  procedures: DisplayableProcedure[];
  onSelectProcedure: (procedure: DisplayableProcedure) => void;
  date?: Date;
}

const statusConfig: Record<
  ProcedureStatus,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  scheduled: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  pre_op: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  in_progress: {
    icon: <PlayCircle className="h-4 w-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  completed: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  cancelled: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  },
  postponed: {
    icon: <PauseCircle className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  complications: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
};

const priorityColors: Record<ProcedurePriority, string> = {
  routine: 'border-l-gray-400',
  urgent: 'border-l-amber-500',
  emergency: 'border-l-red-500',
  elective: 'border-l-green-400',
};

const ProcedureSchedule: React.FC<ProcedureScheduleProps> = ({
  procedures,
  onSelectProcedure,
  date = new Date(),
}) => {
  // Group procedures by time slot (hour)
  const timeSlots = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM

  const getProceduresForSlot = (hour: number) => {
    return procedures.filter((p) => {
      if (!p.scheduled_date) return false;
      // Extract hour from scheduled_date if it contains time info
      const dateObj = new Date(p.scheduled_date);
      return dateObj.getHours() === hour;
    });
  };

  const getUnscheduledProcedures = () => {
    return procedures.filter((p) => !p.scheduled_date);
  };

  const formatTime = (hour: number) => {
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${suffix}`;
  };

  return (
    <div className="space-y-4">
      {/* Date Header */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {date.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {procedures.length} procedure{procedures.length !== 1 ? 's' : ''}{' '}
              scheduled
            </p>
          </div>
        </div>
      </div>

      {/* Unscheduled Procedures */}
      {getUnscheduledProcedures().length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="font-medium text-amber-800">Unscheduled Procedures</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {getUnscheduledProcedures().map((procedure) => (
              <ProcedureCard
                key={getProcedureId(procedure)}
                procedure={procedure}
                onClick={() => onSelectProcedure(procedure)}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Time Slots */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {timeSlots.map((hour, index) => {
          const slotProcedures = getProceduresForSlot(hour);
          const isCurrentHour = new Date().getHours() === hour;

          return (
            <div
              key={hour}
              className={`flex border-b last:border-b-0 ${
                isCurrentHour ? 'bg-blue-50/50' : ''
              }`}
            >
              {/* Time Label */}
              <div className="w-24 flex-shrink-0 p-4 border-r bg-gray-50">
                <p
                  className={`text-sm font-medium ${
                    isCurrentHour ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {formatTime(hour)}
                </p>
                {isCurrentHour && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    <span className="text-xs text-blue-600">Now</span>
                  </div>
                )}
              </div>

              {/* Procedures */}
              <div className="flex-1 p-3 min-h-[80px]">
                {slotProcedures.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {slotProcedures.map((procedure) => (
                      <ProcedureCard
                        key={getProcedureId(procedure)}
                        procedure={procedure}
                        onClick={() => onSelectProcedure(procedure)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center">
                    <p className="text-sm text-gray-400">No procedures</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Procedure Card Component
interface ProcedureCardProps {
  procedure: DisplayableProcedure;
  onClick: () => void;
  compact?: boolean;
}

const ProcedureCard: React.FC<ProcedureCardProps> = ({
  procedure,
  onClick,
  compact = false,
}) => {
  const status = statusConfig[procedure.status];
  const priorityBorder = priorityColors[procedure.priority];
  const procedureNumber = getProcedureNumber(procedure);
  const indication = getIndication(procedure);
  const procedureId = getProcedureId(procedure);

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`p-3 rounded-lg border-2 border-l-4 ${priorityBorder} text-left hover:shadow-md transition-shadow bg-white`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">
            {procedureNumber}
          </span>
          <div className={`p-1 rounded ${status.bgColor} ${status.color}`}>
            {status.icon}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1 truncate">{indication}</p>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border-2 border-l-4 ${priorityBorder} text-left hover:shadow-md transition-all bg-white group`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{procedureNumber}</span>
            {procedure.priority === 'emergency' && (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 truncate">{indication}</p>
        </div>
        <div
          className={`p-1.5 rounded-lg ${status.bgColor} ${status.color} flex items-center gap-1`}
        >
          {status.icon}
          <span className="text-xs font-medium capitalize hidden group-hover:inline">
            {procedure.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <User className="h-3.5 w-3.5" />
          <span>Patient ID</span>
        </div>
        {procedure.scheduled_date && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {new Date(procedure.scheduled_date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
        {procedure.scheduled_duration_minutes && (
          <div className="flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" />
            <span>{procedure.scheduled_duration_minutes} min</span>
          </div>
        )}
      </div>
    </button>
  );
};

export default ProcedureSchedule;
