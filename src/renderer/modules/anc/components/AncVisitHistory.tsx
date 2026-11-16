// =============================================================================
// ANC Module — Visit History
// Shows chronological list of ANC visits for a pregnancy episode
// =============================================================================

import React from 'react';
import {
  CalendarDays,
  CheckCircle,
  Clock,
  ChevronRight,
  Stethoscope,
  Heart,
} from 'lucide-react';
import { useAncVisits } from '../hooks/useAnc';
import type { AncVisit } from '../api/anc.types';

interface Props {
  pregnancyEpisodeId: string;
  onSelectVisit?: (visit: AncVisit) => void;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; label: string; icon: React.ReactNode }
> = {
  in_progress: {
    color: 'bg-blue-100 text-blue-700',
    label: 'In Progress',
    icon: <Clock className="h-3 w-3" />,
  },
  completed: {
    color: 'bg-green-100 text-green-700',
    label: 'Completed',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  cancelled: {
    color: 'bg-gray-100 text-gray-500',
    label: 'Cancelled',
    icon: <Clock className="h-3 w-3" />,
  },
};

const VISIT_TYPE_LABELS: Record<string, string> = {
  booking: 'Booking Visit',
  routine_followup: 'Routine Follow-up',
  urgent_review: 'Urgent Review',
};

export default function AncVisitHistory({
  pregnancyEpisodeId,
  onSelectVisit,
}: Props) {
  const { data: visits, isLoading } = useAncVisits(pregnancyEpisodeId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!visits || visits.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        No visits recorded yet for this pregnancy
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visits.map((visit) => {
        const status =
          STATUS_CONFIG[visit.visit_status] || STATUS_CONFIG.in_progress;
        return (
          <button
            key={visit.id}
            onClick={() => onSelectVisit?.(visit)}
            className="w-full flex items-center justify-between bg-white border rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-xs flex-shrink-0 mt-0.5">
                #{visit.visit_number}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    {VISIT_TYPE_LABELS[visit.visit_type] || visit.visit_type}
                  </p>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-0.5 ${status.color}`}
                  >
                    {status.icon}
                    {status.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  <CalendarDays className="inline h-3 w-3 mr-1" />
                  {new Date(visit.visit_date).toLocaleDateString()}
                  {visit.gestational_age_weeks != null && (
                    <span className="ml-2">
                      GA: {visit.gestational_age_weeks}w
                      {visit.gestational_age_days
                        ? ` ${visit.gestational_age_days}d`
                        : ''}
                      {visit.trimester && ` (T${visit.trimester})`}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span
                    className={`flex items-center gap-1 ${visit.nurse_completed ? 'text-green-600' : 'text-gray-400'}`}
                  >
                    <Heart className="h-3 w-3" />
                    Nurse: {visit.nurse_completed ? 'Done' : 'Pending'}
                  </span>
                  <span
                    className={`flex items-center gap-1 ${visit.doctor_completed ? 'text-green-600' : 'text-gray-400'}`}
                  >
                    <Stethoscope className="h-3 w-3" />
                    Doctor: {visit.doctor_completed ? 'Done' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
