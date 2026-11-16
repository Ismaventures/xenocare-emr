// =============================================================================
// ANC Module — Medications Panel
// Shows prescriptions for the ANC encounter
// =============================================================================

import React from 'react';
import { Pill } from 'lucide-react';
import { useAncPrescriptions } from '../hooks/useAnc';

interface Props {
  encounterId: string | undefined;
}

export default function AncMedicationsPanel({ encounterId }: Props) {
  const { data: prescriptions = [] } = useAncPrescriptions(encounterId);

  if (!encounterId) {
    return (
      <p className="text-gray-400 text-sm text-center py-8">
        No encounter linked to this visit.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-pink-50 border border-pink-200 rounded p-2 text-xs text-pink-700">
        Medications prescribed during this ANC visit. Includes ANC-specific
        supplements (folic acid, iron, etc.) and any other prescriptions.
      </div>

      {prescriptions.length === 0 ? (
        <div className="text-center py-12">
          <Pill className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm italic">
            No medications prescribed for this visit yet.
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Use the prescription module to add medications.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                  Medication
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                  Dosage
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                  Frequency
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                  Route
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                  Duration
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prescriptions.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">
                    {p.drug_name || p.drug?.name || 'Medication'}
                  </td>
                  <td className="px-3 py-2">{p.dosage || '-'}</td>
                  <td className="px-3 py-2">{p.frequency || '-'}</td>
                  <td className="px-3 py-2">{p.route || '-'}</td>
                  <td className="px-3 py-2">{p.duration || '-'}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        p.status === 'dispensed'
                          ? 'bg-green-100 text-green-700'
                          : p.status === 'administered'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.status || 'pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
