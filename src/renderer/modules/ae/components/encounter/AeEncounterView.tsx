// =============================================================================
// AeEncounterView — Modern A&E Encounter View
// Professional tabbed layout mimicking InPatient AdmissionCareModal design exactly
// =============================================================================

import React, { useState, lazy, Suspense } from 'react';
import {
  Ambulance,
  HeartPulse,
  Shield,
  Stethoscope,
  FlaskConical,
  Pill,
  ClipboardList,
  LogOut,
  Clock,
  ChevronLeft,
  AlertTriangle,
  Activity,
  PanelRight,
  Zap,
  User,
  Hash,
  Siren,
  X,
} from 'lucide-react';
import AeTimeline from '../timeline/AeTimeline';
import { UniversalOrderButton } from '../../../../components/orders/UniversalOrderButton';
import PatientVitalsChart from '../../../../components/charts/PatientVitalsChart';
import {
  useAeArrival,
  useAeTriage,
  useAeDisposition,
  useAeVitals,
  useAePrimarySurvey,
} from '../../hooks/useAe';

// Lazy-load heavy form components
const ArrivalSummary = lazy(() => import('../arrival/ArrivalSummary'));
const TriageSummary = lazy(() => import('../triage/TriageSummary'));
const PrimarySurveySummary = lazy(
  () => import('../primary-survey/PrimarySurveySummary'),
);
const ArrivalForm = lazy(() => import('../arrival/ArrivalForm'));
const TriageForm = lazy(() => import('../triage/TriageForm'));
const PrimarySurveyForm = lazy(
  () => import('../primary-survey/PrimarySurveyForm'),
);
const AeConsultationTab = lazy(
  () => import('../consultation/AeConsultationTab'),
);
const AeOrdersPanel = lazy(() => import('../treatment/AeOrdersPanel'));
const AeProcedureForm = lazy(() => import('../treatment/AeProcedureForm'));
const AeFluidChartForm = lazy(() => import('../treatment/AeFluidChartForm'));
const AeNursingNotesForm = lazy(
  () => import('../treatment/AeNursingNotesForm'),
);
const DispositionForm = lazy(() => import('../disposition/DispositionForm'));
const DispositionSummary = lazy(
  () => import('../disposition/DispositionSummary'),
);

interface AeEncounterViewProps {
  encounterId: string;
  patientId: string;
  patientName: string;
  onBack: () => void;
}

const TABS = [
  {
    key: 'summary',
    label: 'Summary',
    icon: Activity,
    description: 'Clinical timeline',
  },
  {
    key: 'arrival',
    label: 'Arrival',
    icon: Ambulance,
    description: 'Registration & triage',
  },
  {
    key: 'triage',
    label: 'Triage',
    icon: HeartPulse,
    description: 'Acuity assessment',
  },
  {
    key: 'survey',
    label: 'ABCDE',
    icon: Shield,
    description: 'Primary survey',
  },
  {
    key: 'consult',
    label: 'Consultation',
    icon: Stethoscope,
    description: 'SOAP + Orders',
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: FlaskConical,
    description: 'View all orders',
  },
  {
    key: 'treatment',
    label: 'Treatment',
    icon: Pill,
    description: 'Procedures & fluids',
  },
  {
    key: 'nursing',
    label: 'Nursing',
    icon: ClipboardList,
    description: 'Nursing notes',
  },
  {
    key: 'dispo',
    label: 'Disposition',
    icon: LogOut,
    description: 'Discharge / admit',
  },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function TabSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin h-8 w-8 border-3 border-red-500 border-t-transparent rounded-full" />
        <span className="text-sm text-slate-400 font-medium">Loading...</span>
      </div>
    </div>
  );
}

export default function AeEncounterView({
  encounterId,
  patientId,
  patientName,
  onBack,
}: AeEncounterViewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('summary');

  const { data: arrival } = useAeArrival(encounterId);
  const { data: survey } = useAePrimarySurvey(encounterId);
  const { data: triage } = useAeTriage(encounterId);
  const { data: disposition } = useAeDisposition(encounterId);
  const { data: vitals = [] } = useAeVitals(encounterId);
  const latestVitals = vitals[0];

  const triageLevel = triage?.triage_level;
  const isCritical = triageLevel && triageLevel <= 2;
  const acuityColor = triage?.acuity_color || triage?.triage_color;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <div className="max-w-6xl mx-auto py-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Clinical Timeline
              </h2>
              <AeTimeline encounterId={encounterId} patientId={patientId} />
            </div>
            {/* Vitals Trend Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-4">
              <PatientVitalsChart patientId={patientId} timeframe="3m" />
            </div>
          </div>
        );
      case 'arrival':
        return (
          <Suspense fallback={<TabSpinner />}>
            {arrival ? (
              <ArrivalSummary encounterId={encounterId} />
            ) : (
              <ArrivalForm onSuccess={() => setActiveTab('triage')} />
            )}
          </Suspense>
        );
      case 'triage':
        return (
          <Suspense fallback={<TabSpinner />}>
            {triage ? (
              <TriageSummary encounterId={encounterId} />
            ) : (
              <TriageForm
                encounterId={encounterId}
                patientId={patientId}
                onSuccess={() => setActiveTab('survey')}
              />
            )}
          </Suspense>
        );
      case 'survey':
        return (
          <Suspense fallback={<TabSpinner />}>
            {survey ? (
              <PrimarySurveySummary encounterId={encounterId} />
            ) : (
              <PrimarySurveyForm
                encounterId={encounterId}
                patientId={patientId}
                onSuccess={() => setActiveTab('consult')}
              />
            )}
          </Suspense>
        );
      case 'consult':
        return (
          <Suspense fallback={<TabSpinner />}>
            <AeConsultationTab
              encounterId={encounterId}
              patientId={patientId}
              onSuccess={() => setActiveTab('orders')}
            />
          </Suspense>
        );
      case 'orders':
        return (
          <Suspense fallback={<TabSpinner />}>
            <AeOrdersPanel encounterId={encounterId} patientId={patientId} patientName={patientName} />
          </Suspense>
        );
      case 'treatment':
        return (
          <Suspense fallback={<TabSpinner />}>
            <div className="space-y-6">
              <AeProcedureForm encounterId={encounterId} patientId={patientId} />
              <AeFluidChartForm encounterId={encounterId} patientId={patientId} />
            </div>
          </Suspense>
        );
      case 'nursing':
        return (
          <Suspense fallback={<TabSpinner />}>
            <AeNursingNotesForm
              encounterId={encounterId}
              patientId={patientId}
            />
          </Suspense>
        );
      case 'dispo':
        return (
          <Suspense fallback={<TabSpinner />}>
            {disposition ? (
              <DispositionSummary encounterId={encounterId} />
            ) : (
              <DispositionForm
                encounterId={encounterId}
                patientId={patientId}
                onSuccess={onBack}
              />
            )}
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center font-sans">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onBack}
      />
      <div className="relative w-full h-[98vh] max-w-[99vw] bg-slate-50 shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-200 rounded-lg">
        <div className="w-52 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-10">
          <div className="h-16 px-4 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Stethoscope size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[11px] font-bold text-slate-900 tracking-tight leading-none uppercase truncate">
                A & E
              </h1>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-0.5 truncate">
                Encounter
              </p>
            </div>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto custom-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-all group ${isActive ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <Icon
                    size={16}
                    className={
                      isActive
                        ? 'text-blue-400'
                        : 'text-slate-400 group-hover:text-slate-900'
                    }
                  />
                  <span
                    className={`text-[13px] font-medium ${isActive ? 'text-slate-50' : 'text-slate-600 group-hover:text-slate-900'}`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="px-4 py-3 border-t border-slate-100">
            <button
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors"
            >
              <X size={14} />
              Close Encounter
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 relative">
          <header className="h-16 bg-white px-6 border-b border-slate-200 flex items-center justify-between z-10 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                  <User size={22} />
                </div>
                {acuityColor && (
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded bg-${acuityColor.toLowerCase()}-500 border-2 border-white`}
                    title={`Triage: ${acuityColor}`}
                  />
                )}
              </div>

              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 leading-none">
                    {patientName}
                  </h2>
                  {isCritical && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded flex items-center gap-1 uppercase">
                      <AlertTriangle size={10} />
                      Critical
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Hash size={12} className="text-slate-400" />
                    {encounterId.slice(0, 8)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-slate-400" />
                    {arrival?.arrival_time
                      ? new Date(arrival.arrival_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A'}
                  </span>
                  {arrival?.arrival_mode && (
                    <span className="flex items-center gap-1 capitalize">
                      • {arrival.arrival_mode.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {latestVitals && (
                <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <VitalPill
                    label="BP"
                    value={
                      latestVitals.blood_pressure_systolic &&
                      latestVitals.blood_pressure_diastolic
                        ? `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic}`
                        : '-'
                    }
                    icon={Activity}
                  />
                  <div className="w-px h-6 bg-slate-200" />
                  <VitalPill
                    label="HR"
                    value={latestVitals.pulse || latestVitals.pulse_rate || '-'}
                    icon={HeartPulse}
                  />
                  <div className="w-px h-6 bg-slate-200" />
                  <VitalPill
                    label="SpO2"
                    value={
                      latestVitals.oxygen_saturation
                        ? `${latestVitals.oxygen_saturation}%`
                        : '-'
                    }
                    icon={Zap}
                  />
                </div>
              )}

              {/* Unified Order Button — same as GOPD QuickOrderModal */}
              <UniversalOrderButton
                encounterId={encounterId}
                patientId={patientId}
                patientName={patientName}
                encounterType="Emergency"
              />
            </div>
          </header>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth styled-scrollbar">
              {activeTab !== 'consult' && (
                <div className="mb-6 pb-4 border-b border-slate-200 w-full">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {React.createElement(
                      TABS.find((t) => t.key === activeTab)?.icon ||
                        FlaskConical,
                      { className: 'text-blue-500', size: 24 },
                    )}
                    {TABS.find((t) => t.key === activeTab)?.label}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {TABS.find((t) => t.key === activeTab)?.description}
                  </p>
                </div>
              )}

              <div className="w-full">{renderTabContent()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VitalPill({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-2 min-w-[70px]">
      <Icon size={14} className="text-slate-400" />
      <div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
          {label}
        </div>
        <div className="text-sm font-bold text-slate-700 leading-tight block mt-0.5">
          {value}
        </div>
      </div>
    </div>
  );
}
