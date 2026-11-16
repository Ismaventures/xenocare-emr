// =============================================================================
// XENOCARE EMR - Procedure Timer Component
// Countdown timer based on scheduled duration - enforces time-based completion
// Status can only change to "Completed" after scheduled duration has elapsed
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Timer,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  Loader2,
} from 'lucide-react';
import type { ProcedureStatus } from '../../../types/database.types';

interface ProcedureTimerProps {
  procedureId: string;
  status: ProcedureStatus;
  scheduledDurationMinutes: number | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  onTimeElapsed?: () => void;
  onCanComplete?: (canComplete: boolean) => void;
}

interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isOvertime: boolean;
  percentComplete: number;
}

const ProcedureTimer: React.FC<ProcedureTimerProps> = ({
  procedureId,
  status,
  scheduledDurationMinutes,
  actualStartTime,
  actualEndTime,
  onTimeElapsed,
  onCanComplete,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(
    null,
  );
  const [hasElapsed, setHasElapsed] = useState(false);

  // Calculate time remaining based on start time and scheduled duration
  const calculateTimeRemaining = useCallback((): TimeRemaining | null => {
    if (!actualStartTime || !scheduledDurationMinutes) {
      return null;
    }

    const startTime = new Date(actualStartTime).getTime();
    const scheduledEndTime = startTime + scheduledDurationMinutes * 60 * 1000;
    const now = Date.now();

    const totalScheduledSeconds = scheduledDurationMinutes * 60;
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const remainingSeconds = Math.floor((scheduledEndTime - now) / 1000);

    const isOvertime = remainingSeconds < 0;
    const displaySeconds = Math.abs(remainingSeconds);

    const hours = Math.floor(displaySeconds / 3600);
    const minutes = Math.floor((displaySeconds % 3600) / 60);
    const seconds = displaySeconds % 60;

    // Percentage of scheduled time completed (caps at 100% when overtime)
    const percentComplete = Math.min(
      100,
      Math.round((elapsedSeconds / totalScheduledSeconds) * 100),
    );

    return {
      hours,
      minutes,
      seconds,
      totalSeconds: displaySeconds,
      isOvertime,
      percentComplete,
    };
  }, [actualStartTime, scheduledDurationMinutes]);

  // Update timer every second when procedure is in progress
  useEffect(() => {
    if (
      status !== 'in_progress' ||
      !actualStartTime ||
      !scheduledDurationMinutes
    ) {
      return;
    }

    const updateTimer = () => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining && remaining.isOvertime && !hasElapsed) {
        setHasElapsed(true);
        onTimeElapsed?.();
        onCanComplete?.(true);
      } else if (remaining && !remaining.isOvertime) {
        onCanComplete?.(false);
      }
    };

    // Initial calculation
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [
    status,
    actualStartTime,
    scheduledDurationMinutes,
    calculateTimeRemaining,
    hasElapsed,
    onTimeElapsed,
    onCanComplete,
  ]);

  // Reset elapsed state when procedure starts
  useEffect(() => {
    if (status === 'scheduled') {
      setHasElapsed(false);
      setTimeRemaining(null);
    }
  }, [status]);

  // For completed procedures, show the actual duration
  if (status === 'completed' && actualStartTime && actualEndTime) {
    const startTime = new Date(actualStartTime).getTime();
    const endTime = new Date(actualEndTime).getTime();
    const actualDurationMinutes = Math.round((endTime - startTime) / 60000);

    const hours = Math.floor(actualDurationMinutes / 60);
    const minutes = actualDurationMinutes % 60;

    const wasOvertime =
      scheduledDurationMinutes &&
      actualDurationMinutes > scheduledDurationMinutes;
    const wasUndertime =
      scheduledDurationMinutes &&
      actualDurationMinutes < scheduledDurationMinutes;

    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">
                Procedure Completed
              </p>
              <p className="text-xs text-green-600">
                Actual Duration: {hours > 0 ? `${hours}h ` : ''}
                {minutes}m
                {scheduledDurationMinutes && (
                  <span className="ml-2">
                    (Scheduled: {Math.floor(scheduledDurationMinutes / 60)}h{' '}
                    {scheduledDurationMinutes % 60}m)
                  </span>
                )}
              </p>
            </div>
          </div>
          {wasOvertime && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
              Overtime
            </span>
          )}
          {wasUndertime && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              Completed Early
            </span>
          )}
        </div>
      </div>
    );
  }

  // For scheduled procedures, show expected duration
  if (status === 'scheduled') {
    if (!scheduledDurationMinutes) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Clock className="h-6 w-6 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Duration Not Set
              </p>
              <p className="text-xs text-gray-500">
                Set expected duration when scheduling
              </p>
            </div>
          </div>
        </div>
      );
    }

    const hours = Math.floor(scheduledDurationMinutes / 60);
    const minutes = scheduledDurationMinutes % 60;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Timer className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-700">
              Scheduled Duration
            </p>
            <p className="text-2xl font-bold text-blue-900">
              {hours > 0 ? `${hours}h ` : ''}
              {minutes}m
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Timer will start when procedure begins
            </p>
          </div>
        </div>
      </div>
    );
  }

  // For in-progress procedures, show countdown
  if (status === 'in_progress' && timeRemaining) {
    const { hours, minutes, seconds, isOvertime, percentComplete } =
      timeRemaining;

    return (
      <div
        className={`rounded-xl p-4 border ${
          isOvertime
            ? 'bg-green-50 border-green-200'
            : percentComplete >= 80
              ? 'bg-amber-50 border-amber-200'
              : 'bg-blue-50 border-blue-200'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isOvertime
                  ? 'bg-green-100'
                  : percentComplete >= 80
                    ? 'bg-amber-100'
                    : 'bg-blue-100'
              }`}
            >
              {isOvertime ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <Timer
                  className={`h-6 w-6 ${percentComplete >= 80 ? 'text-amber-600' : 'text-blue-600'}`}
                />
              )}
            </div>
            <div>
              <p
                className={`text-sm font-medium ${
                  isOvertime
                    ? 'text-green-700'
                    : percentComplete >= 80
                      ? 'text-amber-700'
                      : 'text-blue-700'
                }`}
              >
                {isOvertime ? 'Time Elapsed - Can Complete' : 'Time Remaining'}
              </p>
              <p
                className={`text-3xl font-bold font-mono ${
                  isOvertime
                    ? 'text-green-900'
                    : percentComplete >= 80
                      ? 'text-amber-900'
                      : 'text-blue-900'
                }`}
              >
                {isOvertime ? '+' : ''}
                {hours > 0 ? `${hours.toString().padStart(2, '0')}:` : ''}
                {minutes.toString().padStart(2, '0')}:
                {seconds.toString().padStart(2, '0')}
              </p>
            </div>
          </div>

          {isOvertime ? (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                <CheckCircle2 className="h-4 w-4" />
                Ready to Complete
              </span>
            </div>
          ) : (
            <div className="text-right">
              <span
                className={`text-sm font-medium ${percentComplete >= 80 ? 'text-amber-600' : 'text-blue-600'}`}
              >
                {percentComplete}% Complete
              </span>
              {!isOvertime && (
                <p className="text-xs text-gray-500 mt-1">
                  Complete button activates after scheduled time
                </p>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isOvertime
                ? 'bg-green-500'
                : percentComplete >= 80
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, percentComplete)}%` }}
          />
        </div>

        {/* Phase Indicators */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Start</span>
          <span
            className={
              percentComplete >= 50 ? 'text-amber-600 font-medium' : ''
            }
          >
            Halfway
          </span>
          <span className={isOvertime ? 'text-green-600 font-medium' : ''}>
            Scheduled End
          </span>
        </div>

        {/* Warnings */}
        {!isOvertime && percentComplete >= 90 && (
          <div className="mt-3 p-2 bg-amber-100 border border-amber-200 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700">
              Approaching scheduled completion time
            </span>
          </div>
        )}
      </div>
    );
  }

  // For in-progress without duration set
  if (status === 'in_progress' && !scheduledDurationMinutes) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg animate-pulse">
            <PlayCircle className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-700">
              Procedure In Progress
            </p>
            <p className="text-xs text-amber-600">
              No scheduled duration - can complete anytime
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default state
  return null;
};

export default ProcedureTimer;
