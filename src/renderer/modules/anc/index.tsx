// =============================================================================
// ANC Module — Main Entry Point
// View states: Dashboard | New Enrollment | Pregnancy Detail
// =============================================================================

import React, { useState, useCallback } from 'react';
import { Baby, HeartPulse } from 'lucide-react';
import type { PregnancyEpisode } from './api/anc.types';
import AncDashboard from './components/AncDashboard';
import PregnancyEnrollmentForm from './components/PregnancyEnrollmentForm';
import PregnancyDetailView from './components/PregnancyDetailView';

type View = 'dashboard' | 'enroll' | 'detail';

export default function AncModule() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(
    null,
  );

  const handleSelectPregnancy = useCallback((ep: PregnancyEpisode) => {
    setSelectedEpisodeId(ep.id);
    setView('detail');
  }, []);

  const handleNewEnrollment = useCallback(() => {
    setView('enroll');
  }, []);

  const handleEnrollmentSuccess = useCallback((episodeId: string) => {
    setSelectedEpisodeId(episodeId);
    setView('detail');
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setSelectedEpisodeId(null);
    setView('dashboard');
  }, []);

  // Full-page sub-views
  if (view === 'enroll') {
    return (
      <PregnancyEnrollmentForm
        onBack={handleBackToDashboard}
        onSuccess={handleEnrollmentSuccess}
      />
    );
  }

  if (view === 'detail' && selectedEpisodeId) {
    return (
      <PregnancyDetailView
        episodeId={selectedEpisodeId}
        onBack={handleBackToDashboard}
      />
    );
  }

  // Dashboard view
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">
              <Baby className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Antenatal Care</h1>
              <p className="text-xs text-gray-400">
                Pregnancy care &amp; monitoring
              </p>
            </div>
          </div>
          <button
            onClick={handleNewEnrollment}
            className="inline-flex items-center gap-1.5 rounded-lg bg-pink-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-pink-700 transition-colors"
          >
            <HeartPulse className="h-4 w-4" />
            New Enrollment
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
        <AncDashboard
          onSelectPregnancy={handleSelectPregnancy}
          onNewEnrollment={handleNewEnrollment}
        />
      </div>
    </div>
  );
}
