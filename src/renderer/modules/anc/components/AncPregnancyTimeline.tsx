// =============================================================================
// ANC Module — Pregnancy Timeline
// Visual chronological timeline of ANC visits with status indicators
// Example: ✔ Booking 12w → ✔ ANC 16w → ● ANC 20w (current) → ○ ANC 24w
// =============================================================================

import React from 'react';
import { CheckCircle, Clock, Circle } from 'lucide-react';
import { useAncVisits } from '../hooks/useAnc';
import type { AncVisit } from '../api/anc.types';

interface Props {
  pregnancyEpisodeId: string;
  currentVisitId?: string;
  onSelectVisit?: (visit: AncVisit) => void;
}

const VISIT_TYPE_SHORT: Record<string, string> = {
  booking: 'Booking',
  routine_followup: 'ANC',
  urgent_review: 'Urgent',
};

export default function AncPregnancyTimeline({
  pregnancyEpisodeId,
  currentVisitId,
  onSelectVisit,
}: Props) {
  const { data: visits = [], isLoading } = useAncVisits(pregnancyEpisodeId);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto py-2 px-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-100 h-10 w-24 rounded-full flex-shrink-0"
          />
        ))}
      </div>
    );
  }

  if (visits.length === 0) return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2 px-1 scrollbar-thin">
      {visits.map((visit, idx) => {
        const isCurrent = visit.id === currentVisitId;
        const isCompleted = visit.visit_status === 'completed';
        const isInProgress = visit.visit_status === 'in_progress';
        const label = VISIT_TYPE_SHORT[visit.visit_type] || visit.visit_type;
        const ga =
          visit.gestational_age_weeks != null
            ? `${visit.gestational_age_weeks}w`
            : '';

        return (
          <React.Fragment key={visit.id}>
            {idx > 0 && (
              <div
                className={`h-0.5 w-4 flex-shrink-0 ${
                  isCompleted || visits[idx - 1]?.visit_status === 'completed'
                    ? 'bg-green-400'
                    : 'bg-gray-200'
                }`}
              />
            )}
            <button
              onClick={() => onSelectVisit?.(visit)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all border ${
                isCurrent
                  ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                  : isCompleted
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    : isInProgress
                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {isCompleted && !isCurrent && <CheckCircle className="h-3 w-3" />}
              {isInProgress && !isCurrent && <Clock className="h-3 w-3" />}
              {!isCompleted && !isInProgress && !isCurrent && (
                <Circle className="h-3 w-3" />
              )}
              <span>
                #{visit.visit_number} {label}
                {ga && <span className="ml-0.5 opacity-75">{ga}</span>}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
