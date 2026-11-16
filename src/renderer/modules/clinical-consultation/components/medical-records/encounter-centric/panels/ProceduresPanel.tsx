/**
 * ProceduresPanel - Displays procedures and referrals for an encounter
 */

import React, { useState } from 'react';
import { Syringe, ChevronDown } from 'lucide-react';
import { EncounterDetail } from '../../../../api/medical-records.api';
import { EmptyState } from '../../../../../../components/ui/DataDisplay';

interface ProceduresPanelProps {
  encounter: EncounterDetail;
}

export function ProceduresPanel({ encounter }: ProceduresPanelProps) {
  const [expandedProc, setExpandedProc] = useState<string | null>(null);
  const referrals = encounter.referrals || [];

  // Since EncounterDetail doesn't have procedures, we show referrals
  // In a real implementation, you'd fetch procedure data separately

  if (referrals.length === 0) {
    return (
      <EmptyState
        title="No Procedures/Referrals"
        description="No procedures or referrals recorded for this encounter."
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">
        Procedures & Referrals ({referrals.length})
      </h2>

      {referrals.map((ref, idx) => {
        const isExpanded = expandedProc === idx.toString();

        return (
          <div
            key={idx}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedProc(isExpanded ? null : idx.toString())
              }
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Syringe size={20} className="text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">
                    {ref.specialty || ref.department || 'Procedure/Referral'}
                  </h3>
                  {ref.reason && (
                    <p className="text-sm text-gray-500 truncate max-w-md">
                      {ref.reason}
                    </p>
                  )}
                </div>
              </div>
              <ChevronDown
                size={20}
                className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            {isExpanded && (
              <div className="border-t border-gray-200 bg-gray-50 p-4">
                {ref.department && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase">
                      Department
                    </p>
                    <p className="font-medium text-gray-900">
                      {ref.department}
                    </p>
                  </div>
                )}
                {ref.specialty && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase">Specialty</p>
                    <p className="font-medium text-gray-900">{ref.specialty}</p>
                  </div>
                )}
                {ref.reason && (
                  <div className="p-3 bg-white border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">
                      Reason / Clinical Indication
                    </h4>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {ref.reason}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
