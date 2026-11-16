/**
 * AIEncounterBrief — compact summary of the current encounter for the AI sidebar.
 */
import React from 'react';
import { User, Calendar, MapPin, Hash } from 'lucide-react';

interface EncounterInfo {
  patientName: string;
  emrNumber?: string;
  visitDate?: string;
  chiefComplaint?: string;
  department?: string;
  encounterType?: string;
}

interface AIEncounterBriefProps {
  encounter: EncounterInfo | null;
  syncStatus?: {
    syncing: boolean;
    totalChunks: number;
    lastUpdated: string | null;
  };
  className?: string;
}

export function AIEncounterBrief({
  encounter,
  syncStatus,
  className = '',
}: AIEncounterBriefProps) {
  if (!encounter) {
    return (
      <div
        className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 ${className}`}
      >
        No patient selected. Open a patient chart to use the AI assistant.
      </div>
    );
  }

  return (
    <div className={`px-3 py-2 space-y-1 ${className}`}>
      {/* Row 1: Name + EMR + sync badge */}
      <div className="flex items-center gap-2">
        <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
          {encounter.patientName}
        </span>
        {encounter.emrNumber && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400 shrink-0">
            <Hash className="w-2.5 h-2.5" />
            {encounter.emrNumber}
          </span>
        )}
        {/* Sync badge inline */}
        {syncStatus && (
          <span className="ml-auto shrink-0">
            {syncStatus.syncing ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-blue-500 dark:text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Syncing…
              </span>
            ) : (
              <span className="text-[10px] text-gray-400">
                {syncStatus.totalChunks} indexed
              </span>
            )}
          </span>
        )}
      </div>

      {/* Row 2: Date + department + CC — all on one line */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-gray-500 dark:text-gray-400">
        {encounter.visitDate && (
          <span className="flex items-center gap-0.5">
            <Calendar className="w-2.5 h-2.5" />
            {new Date(encounter.visitDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        )}
        {encounter.department && (
          <span className="flex items-center gap-0.5">
            <MapPin className="w-2.5 h-2.5" />
            {encounter.department}
          </span>
        )}
        {encounter.chiefComplaint && (
          <span
            className="truncate max-w-[180px]"
            title={encounter.chiefComplaint}
          >
            CC: {encounter.chiefComplaint}
          </span>
        )}
      </div>
    </div>
  );
}
