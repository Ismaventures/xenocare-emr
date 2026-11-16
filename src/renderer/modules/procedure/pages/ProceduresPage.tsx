// =============================================================================
// NDC MEDICAL CENTRE EMR - Procedures Page Component
// Main page for managing medical procedures - Single Master Table View
// =============================================================================

import React, { useState } from 'react';
import {
  Activity,
  Calendar,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useTodaysProcedures, useProcedure } from '../hooks/useProcedures';
import ProcedureForm from '../components/ProcedureForm';
import ProcedureDetails from '../components/ProcedureDetails';
import ProcedureHistoryList from '../components/ProcedureHistoryList';
import { ProcedureExportPanel } from '../components/ProcedureExportPanel';
import type { Procedure } from '../../../types/database.types';

const ProceduresPage: React.FC = () => {
  const [showNewProcedure, setShowNewProcedure] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(
    null,
  );
  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(
    null,
  );

  // For stats only - today's procedures
  const { data: todaysProcedures } = useTodaysProcedures();
  const { data: fetchedProcedure } = useProcedure(selectedProcedureId || '');

  // When fetched procedure is loaded, set it as selected
  React.useEffect(() => {
    if (fetchedProcedure && selectedProcedureId) {
      setSelectedProcedure(fetchedProcedure);
      setSelectedProcedureId(null);
    }
  }, [fetchedProcedure, selectedProcedureId]);

  // Calculate stats for today
  const stats = {
    scheduled:
      todaysProcedures?.filter((p) => p.status === 'scheduled').length || 0,
    inProgress:
      todaysProcedures?.filter((p) => p.status === 'in_progress').length || 0,
    completed:
      todaysProcedures?.filter((p) => p.status === 'completed').length || 0,
    total: todaysProcedures?.length || 0,
  };

  if (showNewProcedure) {
    return (
      <ProcedureForm
        onSuccess={() => setShowNewProcedure(false)}
        onCancel={() => setShowNewProcedure(false)}
      />
    );
  }

  if (selectedProcedure) {
    return (
      <ProcedureDetails
        procedure={selectedProcedure}
        onBack={() => setSelectedProcedure(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Procedures</h1>
            <p className="text-sm text-gray-500 mt-1">
              View all procedures - schedule, track, and manage medical
              procedures
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ProcedureExportPanel data={todaysProcedures ?? []} />
            <button
              onClick={() => setShowNewProcedure(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Schedule Procedure
            </button>
          </div>
        </div>

        {/* Navigation Help */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <h3 className="font-semibold mb-1">
              How to navigate the Procedures Module
            </h3>
            <p>
              This module tracks all non-surgical clinical procedures. Use the{' '}
              <strong>'Schedule Procedure'</strong> button to record a new
              procedure for a patient. The list below shows today's schedule by
              default. You can search or filter to find specific records. Select
              any item in the list to view its full history, clinical notes, and
              checklists.
            </p>
          </div>
        </div>

        {/* Stats Cards - Today's Summary */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">
                  {stats.scheduled}
                </p>
                <p className="text-sm text-blue-600">Scheduled Today</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900">
                  {stats.inProgress}
                </p>
                <p className="text-sm text-amber-600">In Progress</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">
                  {stats.completed}
                </p>
                <p className="text-sm text-green-600">Completed Today</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-900">
                  {stats.total}
                </p>
                <p className="text-sm text-purple-600">Total Today</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Single Master Table */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <ProcedureHistoryList
          onSelectProcedure={(id) => setSelectedProcedureId(id)}
        />
      </div>
    </div>
  );
};

export default ProceduresPage;
