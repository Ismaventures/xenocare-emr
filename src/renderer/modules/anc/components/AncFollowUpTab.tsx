// =============================================================================
// ANC Module — Follow-Up Tab
// Shows next appointment info, follow-up notes from doctor review,
// and scheduling details for the next ANC visit
// =============================================================================

import React from 'react';
import { CalendarDays, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import type { AncVisit } from '../api/anc.types';

interface Props {
  visit: AncVisit;
}

export default function AncFollowUpTab({ visit }: Props) {
  const nextDate = visit.next_visit_date;
  const isCompleted = visit.visit_status === 'completed';
  const doctorReview = (visit as any).doctor_review;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Next Appointment Card */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-pink-600" />
            Next Appointment
          </h3>
        </div>
        <div className="p-5">
          {nextDate ? (
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-pink-100 flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-pink-700">
                  {new Date(nextDate).getDate()}
                </span>
                <span className="text-[10px] text-pink-600 font-medium uppercase">
                  {new Date(nextDate).toLocaleString('default', {
                    month: 'short',
                  })}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(nextDate).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Scheduled during visit #{visit.visit_number}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-amber-700 bg-amber-50 rounded-lg px-4 py-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  No follow-up date scheduled
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {isCompleted
                    ? 'Doctor should schedule next visit during review.'
                    : 'Next visit date will be set when doctor completes their review.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visit Status Summary */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Visit Completion Status
          </h3>
        </div>
        <div className="p-5 space-y-3">
          <StatusRow label="Nursing Assessment" done={visit.nurse_completed} />
          <StatusRow label="Doctor Review" done={visit.doctor_completed} />
          <StatusRow
            label="Visit Completed"
            done={visit.visit_status === 'completed'}
          />
        </div>
      </div>

      {/* Doctor Follow-up Notes (if present) */}
      {doctorReview?.follow_up_notes && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-gray-900">
              Follow-Up Instructions
            </h3>
          </div>
          <div className="p-5">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {doctorReview.follow_up_notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      {done ? (
        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
          <CheckCircle className="h-4 w-4" /> Complete
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
          <Clock className="h-4 w-4" /> Pending
        </span>
      )}
    </div>
  );
}
