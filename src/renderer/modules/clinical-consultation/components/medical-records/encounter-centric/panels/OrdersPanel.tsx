import React, { useState } from 'react';
import { FlaskConical, Pill, Scan, Syringe } from 'lucide-react';
import { EncounterDetail } from '../../../../api/medical-records.api';
import { LabsPanel } from './LabsPanel';
import { RadiologyPanel } from './RadiologyPanel';
import { PharmacyPanel } from './PharmacyPanel';
import { ProceduresPanel } from './ProceduresPanel';

type OrdersTab = 'labs' | 'radiology' | 'pharmacy' | 'procedures';

interface OrdersPanelProps {
  encounter: EncounterDetail;
}

const ORDER_TABS: Array<{
  id: OrdersTab;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'labs', label: 'Laboratory', icon: FlaskConical },
  { id: 'radiology', label: 'Radiology', icon: Scan },
  { id: 'pharmacy', label: 'Pharmacy', icon: Pill },
  { id: 'procedures', label: 'Procedures', icon: Syringe },
];

export function OrdersPanel({ encounter }: OrdersPanelProps) {
  const [activeTab, setActiveTab] = useState<OrdersTab>('labs');

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-bold text-gray-900">Orders</h3>
        <p className="text-xs text-gray-500 mt-1">
          Unified view of doctor-ordered labs, radiology, pharmacy, and
          procedures for this encounter.
        </p>

        <div className="mt-3 inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1 gap-1">
          {ORDER_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'labs' && <LabsPanel encounter={encounter} />}
      {activeTab === 'radiology' && <RadiologyPanel encounter={encounter} />}
      {activeTab === 'pharmacy' && <PharmacyPanel encounter={encounter} />}
      {activeTab === 'procedures' && <ProceduresPanel encounter={encounter} />}
    </div>
  );
}
