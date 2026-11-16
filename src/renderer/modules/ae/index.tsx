// =============================================================================
// A&E Module — Main entry point
// Tab navigation: Dashboard | Patient Board | Active Encounter
// =============================================================================

import React, { useState, useCallback } from 'react';
import {
  Siren,
  LayoutDashboard,
  Kanban,
  UserPlus,
  Zap,
} from 'lucide-react';
import AeDashboard from './components/dashboard/AeDashboard';
import AePatientBoard from './components/dashboard/AePatientBoard';
import AeEncounterView from './components/encounter/AeEncounterView';
import AeNewArrival from './components/arrival/AeNewArrival';

type View = 'dashboard' | 'board' | 'encounter' | 'new-arrival';

interface SelectedEncounter {
  encounterId: string;
  patientId: string;
  patientName: string;
}

export default function AeModule() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedEncounter, setSelectedEncounter] =
    useState<SelectedEncounter | null>(null);

  const handleSelectEncounter = useCallback(
    (encounterId: string, patientId: string, patientName: string) => {
      setSelectedEncounter({ encounterId, patientId, patientName });
      setView('encounter');
    },
    [],
  );

  const handleBackFromEncounter = useCallback(() => {
    setSelectedEncounter(null);
    setView('dashboard');
  }, []);

  const handleNewArrivalSuccess = useCallback((encounterId: string) => {
    // After successful arrival registration, go back to dashboard
    setView('dashboard');
  }, []);

  // If registering a new A&E arrival, show the arrival flow
  if (view === 'new-arrival') {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-[#005FB8] text-white px-6 py-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Siren className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">New A&E Arrival</h1>
              <p className="text-blue-200 text-xs">
                Register a new emergency patient
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-[#F5F7FA]">
          <AeNewArrival
            onBack={() => setView('dashboard')}
            onSuccess={handleNewArrivalSuccess}
          />
        </div>
      </div>
    );
  }

  // If viewing a specific encounter, show the full encounter view
  if (view === 'encounter' && selectedEncounter) {
    return (
      <AeEncounterView
        encounterId={selectedEncounter.encounterId}
        patientId={selectedEncounter.patientId}
        patientName={selectedEncounter.patientName}
        onBack={handleBackFromEncounter}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header — Clinical Blue theme */}
      <div className="bg-[#005FB8] text-white px-6 py-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Siren className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Accident & Emergency
              </h1>
              <p className="text-blue-200 text-xs">
                Ward Overview & Patient Tracking
              </p>
            </div>
          </div>

          {/* Right side: view tabs + emergency button */}
          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="flex bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setView('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === 'dashboard'
                    ? 'bg-white text-[#005FB8] shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => setView('board')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === 'board'
                    ? 'bg-white text-[#005FB8] shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Kanban className="h-4 w-4" />
                Patient Board
              </button>
            </div>

            {/* Stat Arrival Button — prominent red */}
            <button
              onClick={() => setView('new-arrival')}
              className="flex items-center gap-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-red-900/20"
            >
              <Zap className="h-4 w-4" />
              Stat Arrival
            </button>
          </div>
        </div>
      </div>

      {/* Content — light gray background */}
      <div className="flex-1 overflow-auto p-6 bg-[#F5F7FA]">
        {view === 'dashboard' && (
          <AeDashboard onSelectEncounter={handleSelectEncounter} />
        )}
        {view === 'board' && (
          <AePatientBoard onSelectEncounter={handleSelectEncounter} />
        )}
      </div>
    </div>
  );
}
