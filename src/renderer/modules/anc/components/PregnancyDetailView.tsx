// =============================================================================
// ANC Module — Pregnancy Episode Detail View
// Timeline layout: Summary sidebar + vertical visit timeline
// =============================================================================

import React, { useState } from 'react';
import {
  ArrowLeft,
  Baby,
  CalendarPlus,
  Heart,
  AlertTriangle,
  Truck,
  CheckCircle,
  Clock,
  Stethoscope,
  ChevronRight,
  HelpCircle,
  BookOpen,
  X,
} from 'lucide-react';
import {
  usePregnancyEpisode,
  useCreateAncEncounterAndVisit,
  useAncVisits,
  useActiveRiskFlags,
} from '../hooks/useAnc';
import type { AncVisit } from '../api/anc.types';
import PregnancySummaryCard from './PregnancySummaryCard';
import AncVisitView from './AncVisitView';
import AncRiskFlags from './AncRiskFlags';
import AncRiskAlertsBanner from './AncRiskAlertsBanner';
import AncPregnancyTimeline from './AncPregnancyTimeline';
import DeliveryOutcomeForm from './DeliveryOutcomeForm';

interface Props {
  episodeId: string;
  onBack: () => void;
}

type SubView = 'overview' | 'visit' | 'delivery';

export default function PregnancyDetailView({ episodeId, onBack }: Props) {
  const [subView, setSubView] = useState<SubView>('overview');
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const { data: episode, isLoading } = usePregnancyEpisode(episodeId);
  const { data: visits = [] } = useAncVisits(episodeId);
  const { data: activeFlags = [] } = useActiveRiskFlags(episodeId);
  const createVisit = useCreateAncEncounterAndVisit();

  if (isLoading || !episode) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
      </div>
    );
  }

  if (subView === 'visit' && activeVisitId) {
    return (
      <AncVisitView
        ancVisitId={activeVisitId}
        pregnancyEpisodeId={episodeId}
        allVisits={visits}
        onSelectVisit={(v) => setActiveVisitId(v.id)}
        onBack={() => {
          setActiveVisitId(null);
          setSubView('overview');
        }}
      />
    );
  }

  if (subView === 'delivery') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 border-b bg-white px-6 py-4">
          <button
            onClick={() => setSubView('overview')}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50">
            <Truck className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Record Delivery Outcome</h1>
            <p className="text-xs text-gray-400">
              {episode.patient?.first_name} {episode.patient?.surname} · Episode #
              {episode.episode_number}
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          <DeliveryOutcomeForm
            pregnancyEpisodeId={episodeId}
            onSuccess={() => setSubView('overview')}
          />
        </div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const hasTodayVisit = visits.some((v) => v.visit_date === todayStr);
  const todayVisit = visits.find((v) => v.visit_date === todayStr);

  const handleStartVisit = async () => {
    if (hasTodayVisit && todayVisit) {
      setActiveVisitId(todayVisit.id);
      setSubView('visit');
      return;
    }
    try {
      const result = await createVisit.mutateAsync({
        patient_id: episode.patient_id,
        pregnancy_episode_id: episodeId,
        visit_type: 'routine_followup',
        clinic_id: episode.clinic_id || undefined,
        attending_doctor_id: episode.primary_doctor_id || undefined,
      });
      setActiveVisitId(result.anc_visit_id);
      setSubView('visit');
    } catch (err: any) {
      alert(`Failed to start visit: ${err?.message || String(err)}`);
    }
  };

  const handleSelectVisit = (visit: AncVisit) => {
    setActiveVisitId(visit.id);
    setSubView('visit');
  };

  const isDelivered = episode.status === 'delivered';
  const patientName = episode.patient
    ? `${episode.patient.first_name} ${episode.patient.surname}`
    : 'Patient';

  const sortedVisits = [...visits].sort(
    (a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime(),
  );

  return (
    <div className="h-full flex flex-col">
      {/* Compact white header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50">
            <Baby className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">{patientName}</h1>
            <p className="text-xs text-gray-400">
              Episode #{episode.episode_number} ·{' '}
              <span className={`font-medium ${isDelivered ? 'text-green-600' : 'text-pink-600'}`}>
                {episode.status.toUpperCase()}
                {isDelivered && ' ✓'}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              showGuide
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            {showGuide ? 'Hide Guide' : 'How It Works'}
          </button>
          {!isDelivered && (
            <>
              <button
                onClick={handleStartVisit}
                disabled={createVisit.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-pink-200 bg-white px-3 py-1.5 text-sm font-medium text-pink-700 shadow-sm hover:bg-pink-50 transition-colors disabled:opacity-50"
              >
                <CalendarPlus className="h-4 w-4" />
                {createVisit.isPending
                  ? 'Starting…'
                  : hasTodayVisit
                    ? 'Continue Visit'
                    : 'New Visit'}
              </button>
              <button
                onClick={() => setSubView('delivery')}
                className="flex items-center gap-1.5 rounded-lg bg-pink-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-pink-700 transition-colors"
              >
                <Truck className="h-4 w-4" />
                Record Delivery
              </button>
            </>
          )}
        </div>
      </div>

      {/* Risk Alerts */}
      <AncRiskAlertsBanner pregnancyEpisodeId={episodeId} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto bg-gray-50/50">
        <div className="max-w-5xl mx-auto px-6 py-5 space-y-5">
          {/* Doctor Guide Panel */}
          {showGuide && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-900">
                    Pregnancy Overview — Doctor Guide
                  </p>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-blue-400 hover:text-blue-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    n: '1',
                    t: 'Review Summary',
                    d: 'The left panel shows GA, EDD, obstetric formula, and blood group.',
                  },
                  {
                    n: '2',
                    t: 'Check Risk Flags',
                    d: 'Review active risk flags before opening a visit — red flags need attention.',
                  },
                  {
                    n: '3',
                    t: 'Open a Visit',
                    d: 'Click any card in the Visit Timeline, or click "New Visit" to start today\'s visit.',
                  },
                  {
                    n: '4',
                    t: 'Record Delivery',
                    d: 'When the patient delivers, click "Record Delivery" to close this episode.',
                  },
                ].map(({ n, t, d }) => (
                  <div key={n} className="flex gap-2">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                      {n}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-800">{t}</p>
                      <p className="mt-0.5 text-[11px] text-blue-600">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
            {/* Left sidebar */}
            <div className="space-y-4">
              <PregnancySummaryCard episode={episode} />
              {/* Risk Flags button — opens modal */}
              <button
                onClick={() => setShowRiskModal(true)}
                className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all hover:shadow-sm ${
                  activeFlags.length > 0
                    ? 'border-red-200 bg-red-50 hover:bg-red-100'
                    : 'border-gray-100 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`h-4 w-4 ${
                      activeFlags.length > 0 ? 'text-red-500' : 'text-gray-400'
                    }`}
                  />
                  <span
                    className={`text-sm font-semibold ${
                      activeFlags.length > 0 ? 'text-red-700' : 'text-gray-600'
                    }`}
                  >
                    Risk Flags
                  </span>
                  {activeFlags.length > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                      {activeFlags.length}
                    </span>
                  )}
                </div>
                <ChevronRight
                  className={`h-4 w-4 ${
                    activeFlags.length > 0 ? 'text-red-400' : 'text-gray-300'
                  }`}
                />
              </button>
            </div>

            {/* Right: timeline area */}
            <div className="space-y-4">
              {/* Milestone chips */}
              <div className="rounded-xl border border-gray-100 bg-white px-5 py-4">
                <AncPregnancyTimeline
                  pregnancyEpisodeId={episodeId}
                  onSelectVisit={handleSelectVisit}
                />
              </div>

              {/* Vertical visit timeline */}
              <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Clock className="h-4 w-4 text-blue-500" />
                    Visit Timeline
                  </h2>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                    {visits.length} visit{visits.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="p-5">
                  {sortedVisits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">
                        <CalendarPlus className="h-5 w-5 text-pink-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No visits yet</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Click "New Visit" to start the first ANC visit
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Vertical connecting line */}
                      <div className="absolute left-[10px] top-4 bottom-4 w-0.5 bg-gray-100" />
                      <div className="space-y-3">
                        {sortedVisits.map((visit) => {
                          const isCompleted = visit.visit_status === 'completed';
                          const isInProgress = visit.visit_status === 'in_progress';
                          const dotCls = isCompleted
                            ? 'bg-green-500 ring-green-100'
                            : isInProgress
                              ? 'bg-blue-500 ring-blue-100'
                              : 'bg-gray-300 ring-gray-100';
                          return (
                            <div key={visit.id} className="relative flex items-start gap-3">
                              {/* Timeline dot */}
                              <div
                                className={`z-10 mt-3.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-white ring-2 ${dotCls}`}
                              >
                                {isCompleted && <CheckCircle className="h-3 w-3 text-white" />}
                                {isInProgress && (
                                  <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                                )}
                              </div>
                              {/* Visit card */}
                              <button
                                onClick={() => handleSelectVisit(visit)}
                                className="group flex-1 rounded-xl border border-gray-100 bg-gray-50 p-3.5 text-left transition-all hover:border-pink-200 hover:bg-white hover:shadow-sm"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-900">
                                      Visit #{visit.visit_number}
                                    </span>
                                    <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] capitalize text-gray-600">
                                      {visit.visit_type.replace(/_/g, ' ')}
                                    </span>
                                    {visit.trimester && (
                                      <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-medium text-pink-600">
                                        T{visit.trimester}
                                      </span>
                                    )}
                                  </div>
                                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                                  <span>
                                    {new Date(visit.visit_date).toLocaleDateString('en-GB', {
                                      weekday: 'long',
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </span>
                                  <span>·</span>
                                  <span
                                    className={`inline-flex items-center gap-0.5 ${visit.nurse_completed ? 'text-green-600' : 'text-gray-400'}`}
                                  >
                                    <Heart className="h-3 w-3" />
                                    Nurse {visit.nurse_completed ? '✓' : '—'}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-0.5 ${visit.doctor_completed ? 'text-green-600' : 'text-gray-400'}`}
                                  >
                                    <Stethoscope className="h-3 w-3" />
                                    Doctor {visit.doctor_completed ? '✓' : '—'}
                                  </span>
                                  <span className="ml-auto">
                                    {isCompleted && (
                                      <span className="rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700">
                                        Done
                                      </span>
                                    )}
                                    {isInProgress && (
                                      <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                                        In Progress
                                      </span>
                                    )}
                                    {!isCompleted && !isInProgress && (
                                      <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-500">
                                        Pending
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery outcome (read-only if delivered) */}
              {isDelivered && (
                <div className="rounded-xl border border-green-100 bg-white overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-green-100 bg-green-50 px-5 py-3.5">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <h2 className="text-sm font-semibold text-green-800">Delivery Outcome</h2>
                  </div>
                  <div className="p-5">
                    <DeliveryOutcomeForm pregnancyEpisodeId={episodeId} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Risk Flags Modal */}
      {showRiskModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowRiskModal(false)}
        >
          <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Risk Flags</h2>
                  <p className="text-xs text-gray-400">
                    {activeFlags.length > 0
                      ? `${activeFlags.length} active flag${activeFlags.length !== 1 ? 's' : ''}`
                      : 'No active flags'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRiskModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <AncRiskFlags pregnancyEpisodeId={episodeId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
