// =============================================================================
// ANC Module — Visit Encounter View
// Workflow stepper: Nursing → Doctor Review → Orders & Meds → Follow-up
// Includes per-tab toggleable doctor guide
// =============================================================================

import React, { useState } from 'react';
import {
  ArrowLeft,
  Heart,
  Stethoscope,
  FlaskConical,
  CalendarDays,
  CheckCircle,
  Clock,
  Baby,
  HelpCircle,
  BookOpen,
  X,
} from 'lucide-react';
import { useAncVisit, usePregnancyEpisode, useAncObservations, usePregnancyObservations } from '../hooks/useAnc';
import { calculateGestationalAge } from '../api/anc.types';
import type { AncVisit } from '../api/anc.types';
import AncRiskAlertsBanner from './AncRiskAlertsBanner';
import AncNursingForm, { ObservationSummary } from './AncNursingForm';
import AncVitalsChart from './AncVitalsChart';
import AncDoctorReviewForm from './AncDoctorReviewForm';
import AncOrdersPanel from './AncOrdersPanel';
import AncMedicationsPanel from './AncMedicationsPanel';
import AncFollowUpTab from './AncFollowUpTab';
import { UniversalOrderButton } from '../../../components/orders/UniversalOrderButton';

interface Props {
  ancVisitId: string;
  pregnancyEpisodeId: string;
  onBack: () => void;
  allVisits?: AncVisit[];
  onSelectVisit?: (visit: AncVisit) => void;
}

type TabKey = 'nursing' | 'doctor' | 'orders' | 'followup';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  shortLabel: string;
}

const TABS: TabDef[] = [
  { key: 'nursing', label: 'Nursing', shortLabel: 'Nursing', icon: <Heart className="h-4 w-4" /> },
  { key: 'doctor', label: 'Doctor Review', shortLabel: 'Doctor', icon: <Stethoscope className="h-4 w-4" /> },
  { key: 'orders', label: 'Orders & Meds', shortLabel: 'Orders', icon: <FlaskConical className="h-4 w-4" /> },
  { key: 'followup', label: 'Follow-up', shortLabel: 'Follow-up', icon: <CalendarDays className="h-4 w-4" /> },
];

const TAB_GUIDES: Record<TabKey, { title: string; steps: { n: string; t: string; d: string }[] }> = {
  nursing: {
    title: 'Nursing Assessment — Guide',
    steps: [
      { n: '1', t: 'Record Vitals', d: 'Enter blood pressure, pulse, temperature, and weight.' },
      { n: '2', t: 'Obstetric Exam', d: 'Measure fundal height, check FHR, presentation, and fetal movement.' },
      { n: '3', t: 'Urinalysis', d: 'Record urine protein and glucose results from dipstick.' },
      { n: '4', t: 'Save & Proceed', d: 'Click "Save Assessment". This unlocks the Doctor Review step.' },
    ],
  },
  doctor: {
    title: 'Doctor Review — Guide',
    steps: [
      { n: '1', t: 'Review Nursing Data', d: 'The nursing vitals and exam findings are available above.' },
      { n: '2', t: 'Clinical Notes', d: 'Document complaints, examination findings, and your assessment.' },
      { n: '3', t: 'Update Risk Level', d: 'Adjust risk classification (Low / Moderate / High) based on findings.' },
      { n: '4', t: 'Save & Continue', d: 'Save your review, then add investigations or medications in Orders.' },
    ],
  },
  orders: {
    title: 'Orders & Medications — Guide',
    steps: [
      { n: '1', t: 'Add Investigations', d: 'Request blood tests, urinalysis, or imaging (e.g. ultrasound).' },
      { n: '2', t: 'Prescribe Medications', d: 'Add medications from the formulary with dosage and duration.' },
      { n: '3', t: 'Review Active Orders', d: 'All orders and medications for this visit are listed here.' },
      { n: '4', t: 'Proceed to Follow-up', d: 'Once done, go to Follow-up to schedule the next appointment.' },
    ],
  },
  followup: {
    title: 'Follow-up Scheduling — Guide',
    steps: [
      { n: '1', t: 'Next Appointment', d: 'Set the recommended date for the patient\'s next ANC visit.' },
      { n: '2', t: 'Visit Type', d: 'Specify what the next visit will be (routine, specialist, etc.).' },
      { n: '3', t: 'Counselling Notes', d: 'Document any advice, health education, or counselling given.' },
      { n: '4', t: 'Complete Visit', d: 'Save follow-up details to mark this visit step as complete.' },
    ],
  },
};

export default function AncVisitView({ ancVisitId, pregnancyEpisodeId, onBack, allVisits, onSelectVisit }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('nursing');
  const [showGuide, setShowGuide] = useState(false);
  const { data: visit, isLoading: visitLoading } = useAncVisit(ancVisitId);
  const { data: episode } = usePregnancyEpisode(pregnancyEpisodeId);
  const { data: nursingObs } = useAncObservations(ancVisitId);
  const { data: allObs = [] } = usePregnancyObservations(pregnancyEpisodeId);

  if (visitLoading || !visit) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
      </div>
    );
  }

  const ga = episode?.lmp ? calculateGestationalAge(episode.lmp) : null;
  const patientName = episode?.patient
    ? `${episode.patient.first_name} ${episode.patient.surname}`
    : 'Patient';

  const todayStr = new Date().toISOString().split('T')[0];
  const isPastVisit = visit.visit_date < todayStr;

  const guide = TAB_GUIDES[activeTab];

  return (
    <div className="h-full flex flex-col">
      {/* Compact white header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-50">
            <Baby className="h-5 w-5 text-pink-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-gray-900 truncate">{patientName}</h1>
              <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-semibold text-pink-700">
                Visit #{visit.visit_number}
              </span>
              {visit.visit_status === 'completed' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                  <CheckCircle className="h-3 w-3" /> Complete
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {visit.visit_type.replace(/_/g, ' ')}
              {ga && ` · GA: ${ga.weeks}w ${ga.days}d`}
              {visit.trimester && ` · T${visit.trimester}`}
              {' · '}
              {new Date(visit.visit_date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Nurse / Doctor status pills */}
          <StatusDot done={visit.nurse_completed} label="Nurse" />
          <StatusDot done={visit.doctor_completed} label="Doctor" />
          {/* Guide toggle */}
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
          {/* Add Order */}
          {visit.encounter_id && visit.visit_status !== 'completed' && (
            <UniversalOrderButton
              encounterId={visit.encounter_id}
              patientId={episode?.patient_id || ''}
              patientName={patientName}
              encounterType="OPD"
              className="flex items-center gap-1.5 rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-pink-700 transition-colors border border-pink-600 whitespace-nowrap"
            />
          )}
        </div>
      </div>

      {/* Risk Alerts */}
      <AncRiskAlertsBanner pregnancyEpisodeId={pregnancyEpisodeId} />

      {/* Workflow stepper */}
      <div className="border-b bg-white px-6 py-3">
        <div className="flex items-center">
          {TABS.map((tab, idx) => {
            const isActive = activeTab === tab.key;
            const isCompleted =
              (tab.key === 'nursing' && visit.nurse_completed) ||
              (tab.key === 'doctor' && visit.doctor_completed);
            const stepNum = idx + 1;
            return (
              <React.Fragment key={tab.key}>
                <button
                  onClick={() => setActiveTab(tab.key)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all text-xs font-bold ${
                      isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : isActive
                          ? 'border-pink-600 bg-pink-600 text-white'
                          : 'border-gray-200 bg-white text-gray-400 group-hover:border-gray-300'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : stepNum}
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[11px] font-medium whitespace-nowrap ${
                        isActive ? 'text-pink-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {tab.shortLabel}
                    </span>
                  </div>
                </button>
                {idx < TABS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${
                      (idx === 0 && visit.nurse_completed) ||
                      (idx === 1 && visit.doctor_completed)
                        ? 'bg-green-300'
                        : 'bg-gray-100'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Visit switcher strip — shown when there are multiple visits */}
      {allVisits && allVisits.length > 1 && onSelectVisit && (
        <div className="border-b bg-gray-50 px-6 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="shrink-0 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Visits:</span>
            {[...allVisits]
              .sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime())
              .map((v) => {
                const isCurrent = v.id === ancVisitId;
                const isPast = v.visit_date < todayStr;
                return (
                  <button
                    key={v.id}
                    onClick={() => !isCurrent && onSelectVisit(v)}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                      isCurrent
                        ? 'border-pink-300 bg-pink-100 text-pink-700'
                        : isPast
                          ? 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                          : 'border-blue-100 bg-blue-50 text-blue-600 hover:border-blue-200'
                    }`}
                  >
                    {v.visit_status === 'completed' && (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    V#{v.visit_number} ·{' '}
                    {new Date(v.visit_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    {isCurrent && <span className="ml-0.5 text-pink-500">●</span>}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Per-tab guide panel */}
      {showGuide && (
        <div className="border-b bg-blue-50 px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-semibold text-blue-900">{guide.title}</p>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="text-blue-400 hover:text-blue-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {guide.steps.map(({ n, t, d }) => (
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

      {/* Tab content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        {/* Past-visit read-only banner */}
        {isPastVisit && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <Clock className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <span className="font-semibold">Past visit — read only.</span>{' '}
              Records from{' '}
              {new Date(visit.visit_date).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
        {activeTab === 'nursing' && (
          <div className="space-y-4">
            {/* Vitals trend charts across all visits */}
            {allObs.length > 0 && <AncVitalsChart observations={allObs} />}
            <AncNursingForm
              ancVisitId={ancVisitId}
              pregnancyEpisodeId={pregnancyEpisodeId}
              readOnly={isPastVisit}
              onSuccess={() => setActiveTab('doctor')}
            />
          </div>
        )}
        {activeTab === 'doctor' && episode && (
          <div className="space-y-4">
            {/* Nursing summary for doctor reference */}
            {nursingObs && nursingObs.length > 0 && (
              <details className="group" open>
                <summary className="flex items-center gap-2 cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100">
                  <Heart className="h-4 w-4 text-emerald-600" />
                  Nursing Assessment — Reference Data
                  <span className="ml-auto text-[11px] font-normal text-emerald-500">
                    Recorded{' '}
                    {new Date(nursingObs[0].created_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </summary>
                <div className="mt-3">
                  <ObservationSummary obs={nursingObs[0]} compact />
                </div>
              </details>
            )}
            <AncDoctorReviewForm
              ancVisit={visit}
              pregnancyEpisodeId={pregnancyEpisodeId}
              patientId={episode.patient_id}
              encounterId={visit.encounter_id}
              currentRisk={episode.risk_level}
              readOnly={isPastVisit}
              onSuccess={() => setActiveTab('orders')}
            />
          </div>
        )}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <AncOrdersPanel encounterId={visit.encounter_id} />
            <div className="border-t pt-6">
              <AncMedicationsPanel encounterId={visit.encounter_id} />
            </div>
          </div>
        )}
        {activeTab === 'followup' && <AncFollowUpTab visit={visit} />}
      </div>
    </div>
  );
}

function StatusDot({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        done ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {done ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {label}
    </span>
  );
}
