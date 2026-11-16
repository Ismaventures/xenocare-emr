/**
 * PharmacyPanel - Displays prescriptions and medications for an encounter
 */

import React, { useState } from 'react';
import { Pill, ChevronDown } from 'lucide-react';
import { EncounterDetail } from '../../../../api/medical-records.api';
import { EmptyState } from '../../../../../../components/ui/DataDisplay';
import { StatusBadge } from '../shared';

interface PharmacyPanelProps {
  encounter: EncounterDetail;
}

export function PharmacyPanel({ encounter }: PharmacyPanelProps) {
  const [expandedRx, setExpandedRx] = useState<string | null>(null);
  const meds = encounter.medications || [];
  const prescriptions = encounter.prescriptions || [];

  // Use prescriptions if available (has more detail), otherwise medications
  const allMeds =
    prescriptions.length > 0
      ? prescriptions.map((rx) => ({
          prescription_id: rx.id,
          drug_name: rx.drug_name,
          dosage: rx.dosage,
          frequency: rx.frequency,
          duration: rx.duration,
          quantity: rx.quantity,
          instructions: rx.instructions,
          route: rx.route,
          status: rx.dispensed ? 'Dispensed' : 'Pending',
          is_external: rx.is_external,
          is_changed: rx.is_changed,
        }))
      : meds;

  if (allMeds.length === 0) {
    return (
      <EmptyState
        title="No Prescriptions"
        description="No medications prescribed for this encounter."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Prescriptions ({allMeds.length})
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Dispensed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            Pending
          </span>
        </div>
      </div>

      {allMeds.map((med: any, idx) => {
        const isExpanded =
          expandedRx === (med.prescription_id || idx.toString());
        const isDispensed = med.status?.toLowerCase().includes('dispensed');

        return (
          <div
            key={med.prescription_id || idx}
            className={`bg-white border rounded-xl overflow-hidden ${
              med.is_changed
                ? 'border-amber-300 bg-amber-50'
                : 'border-gray-200'
            }`}
          >
            <button
              onClick={() =>
                setExpandedRx(
                  isExpanded ? null : med.prescription_id || idx.toString(),
                )
              }
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isDispensed ? 'bg-green-100' : 'bg-amber-100'
                  }`}
                >
                  <Pill
                    size={20}
                    className={
                      isDispensed ? 'text-green-600' : 'text-amber-600'
                    }
                  />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    {med.drug_name}
                    {med.is_external && (
                      <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                        External ? not dispensed
                      </span>
                    )}
                    {med.is_changed && (
                      <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded">
                        Modified
                      </span>
                    )}
                  </h3>
                  <div className="text-sm text-gray-500">
                    {med.dosage} • {med.frequency} • {med.duration}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={med.status} />
                <ChevronDown
                  size={20}
                  className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-200 bg-gray-50 p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Dosage</p>
                    <p className="font-medium text-gray-900">
                      {med.dosage || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Frequency</p>
                    <p className="font-medium text-gray-900">
                      {med.frequency || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Duration</p>
                    <p className="font-medium text-gray-900">
                      {med.duration || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Quantity</p>
                    <p className="font-medium text-gray-900">
                      {med.quantity || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Route</p>
                    <p className="font-medium text-gray-900">
                      {med.route || '-'}
                    </p>
                  </div>
                </div>
                {med.instructions && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-1">
                      Special Instructions
                    </h4>
                    <p className="text-blue-700">{med.instructions}</p>
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
