// =============================================================================
// AePatientBoard — Kanban-style tracking board by A&E stage
// =============================================================================

import React from 'react';
import { Clock, User } from 'lucide-react';
import { useAeEncounters } from '../../hooks/useAe';
import TriageAcuityBadge from '../triage/TriageAcuityBadge';

interface AePatientBoardProps {
  onSelectEncounter: (
    encounterId: string,
    patientId: string,
    patientName: string,
  ) => void;
}

const BOARD_COLUMNS = [
  { stage: 'ae_arrival', label: 'Arrival', color: 'border-t-blue-500' },
  { stage: 'ae_triage', label: 'Triage', color: 'border-t-yellow-500' },
  { stage: 'ae_assessment', label: 'Assessment', color: 'border-t-orange-500' },
  { stage: 'ae_treatment', label: 'Treatment', color: 'border-t-red-500' },
  {
    stage: 'ae_disposition',
    label: 'Disposition',
    color: 'border-t-green-500',
  },
];

export default function AePatientBoard({
  onSelectEncounter,
}: AePatientBoardProps) {
  const { data: encounters = [], isLoading } = useAeEncounters();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-6 w-6 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 h-full">
      {BOARD_COLUMNS.map((col) => {
        const columnEncounters = encounters.filter(
          (e: any) =>
            e.workflow_stage === col.stage ||
            (!e.workflow_stage && col.stage === 'ae_arrival'),
        );

        return (
          <div
            key={col.stage}
            className={`flex-shrink-0 w-64 bg-gray-50 rounded-lg border border-t-4 ${col.color} flex flex-col`}
          >
            {/* Column Header */}
            <div className="px-3 py-2 border-b bg-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-700">{col.label}</h4>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                  {columnEncounters.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {columnEncounters.length === 0 ? (
                <p className="text-center text-gray-300 text-xs py-4">Empty</p>
              ) : (
                columnEncounters.map((enc: any) => {
                  const waitMins = enc.arrival_time
                    ? Math.round(
                        (Date.now() - new Date(enc.arrival_time).getTime()) /
                          60000,
                      )
                    : null;

                  return (
                    <div
                      key={enc.encounter_id}
                      onClick={() =>
                        onSelectEncounter(
                          enc.encounter_id,
                          enc.patient_id,
                          enc.patient_name || 'Unknown',
                        )
                      }
                      className="bg-white rounded-lg border shadow-sm p-2.5 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {enc.patient_name || 'Unknown'}
                          </span>
                        </div>
                        {enc.acuity_color && (
                          <TriageAcuityBadge
                            color={enc.acuity_color}
                            size="sm"
                          />
                        )}
                      </div>
                      {enc.chief_complaint && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {enc.chief_complaint}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        {waitMins !== null && (
                          <span
                            className={`text-[10px] flex items-center gap-0.5 ${
                              waitMins > 120
                                ? 'text-red-600 font-bold'
                                : 'text-gray-400'
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            {waitMins}m
                          </span>
                        )}
                        {enc.arrival_mode && (
                          <span className="text-[10px] text-gray-400">
                            {enc.arrival_mode}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
