import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bed,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Dumbbell,
  Eye,
  FileText,
  FlaskConical,
  Heart,
  Loader2,
  Pill,
  Scan,
  Scissors,
  Smile,
  User,
  ListTodo,
} from 'lucide-react';
import { formatDetailedAge } from '../../patient-registration/dtos/patient.dto';
import { usePatientMedicalRecords, useEncounterDetails } from '../../clinical-consultation/hooks/useMedicalRecords';
import {
  AdmissionsPanel,
  AllNotesPanel,
  BillingPanel,
  DentalPanel,
  LabsPanel,
  OphthalmologyPanel,
  OverviewPanel,
  PharmacyPanel,
  PhysiotherapyPanel,
  ProceduresPanel,
  RadiologyPanel,
  TimelinePanel,
  TreatmentPlanPanel,
  VitalsPanel,
} from '../../clinical-consultation/components/medical-records/encounter-centric/panels';

type StoryModule =
  | 'overview'
  | 'timeline'
  | 'vitals'
  | 'all-notes'
  | 'labs'
  | 'radiology'
  | 'pharmacy'
  | 'treatment-plan'
  | 'admissions'
  | 'billing'
  | 'procedures'
  | 'dental'
  | 'ophthalmology'
  | 'physiotherapy';

const STORY_MODULES: Array<{
  id: StoryModule;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: 'overview', label: 'Overview', icon: <Activity size={13} /> },
  { id: 'timeline', label: 'Timeline', icon: <Clock size={13} /> },
  { id: 'vitals', label: 'Vitals', icon: <Heart size={13} /> },
  { id: 'all-notes', label: 'Clinical Notes', icon: <FileText size={13} /> },
  { id: 'labs', label: 'Laboratory', icon: <FlaskConical size={13} /> },
  { id: 'radiology', label: 'Radiology', icon: <Scan size={13} /> },
  { id: 'pharmacy', label: 'Pharmacy', icon: <Pill size={13} /> },
  { id: 'treatment-plan', label: 'Treatment Plan', icon: <ListTodo size={13} /> },
  { id: 'admissions', label: 'Ward/Bed', icon: <Bed size={13} /> },
  { id: 'billing', label: 'Financials', icon: <ClipboardList size={13} /> },
  { id: 'procedures', label: 'Procedures', icon: <Scissors size={13} /> },
  { id: 'dental', label: 'Dental', icon: <Smile size={13} /> },
  { id: 'ophthalmology', label: 'Ophthalmology', icon: <Eye size={13} /> },
  { id: 'physiotherapy', label: 'Physiotherapy', icon: <Dumbbell size={13} /> },
];

interface ConsultationPatientStoryPanelProps {
  patientId: string;
  encounterId?: string | null;
}

function formatEncounterDateLabel(value?: string | null): string {
  if (!value) return 'Date not recorded';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not recorded';

  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ConsultationPatientStoryPanel({
  patientId,
  encounterId,
}: ConsultationPatientStoryPanelProps) {
  const [selectedEncId, setSelectedEncId] = useState<string | null>(encounterId || null);
  const [activeModule, setActiveModule] = useState<StoryModule>('overview');
  const [showEncDropdown, setShowEncDropdown] = useState(false);
  const [showQuickView, setShowQuickView] = useState(true);

  const { data: patientData, isLoading: isLoadingPatient } = usePatientMedicalRecords(patientId || null);
  const encounters = patientData?.recent_encounters || [];
  const patient = patientData?.patient;
  const latestVitals = patientData?.latest_vitals;
  const currentMeds = patientData?.current_medications || [];

  useEffect(() => {
    if (!selectedEncId && encounterId) {
      setSelectedEncId(encounterId);
    }
  }, [encounterId, selectedEncId]);

  useEffect(() => {
    if (!selectedEncId && encounters.length > 0) {
      setSelectedEncId(encounters[0].encounter_id);
    }
  }, [encounters, selectedEncId]);

  const { data: encounterDetail, isLoading: isLoadingDetail } = useEncounterDetails(selectedEncId);

  const selectedEnc = encounters.find((enc) => enc.encounter_id === selectedEncId);
  const currentIdx = encounters.findIndex((enc) => enc.encounter_id === selectedEncId);

  const goPrev = () => {
    if (currentIdx > 0) {
      setSelectedEncId(encounters[currentIdx - 1].encounter_id);
      setShowEncDropdown(false);
    }
  };

  const goNext = () => {
    if (currentIdx >= 0 && currentIdx < encounters.length - 1) {
      setSelectedEncId(encounters[currentIdx + 1].encounter_id);
      setShowEncDropdown(false);
    }
  };

  const modulePanel = useMemo(() => {
    if (isLoadingDetail) {
      return (
        <div className="flex h-32 flex-col items-center justify-center text-gray-400">
          <Loader2 size={24} className="mb-2 animate-spin" />
          <span className="text-xs">Loading encounter...</span>
        </div>
      );
    }

    if (!encounterDetail) {
      return (
        <div className="flex h-32 flex-col items-center justify-center text-gray-400">
          <ClipboardList size={24} className="mb-2 opacity-40" />
          <span className="text-xs">Select an encounter</span>
        </div>
      );
    }

    const panelMap: Record<StoryModule, React.ReactNode> = {
      overview: <OverviewPanel encounter={encounterDetail} />,
      timeline: <TimelinePanel encounter={encounterDetail} />,
      vitals: <VitalsPanel encounter={encounterDetail} />,
      'all-notes': <AllNotesPanel encounter={encounterDetail} />,
      labs: <LabsPanel encounter={encounterDetail} onBack={() => setActiveModule('overview')} />,
      radiology: <RadiologyPanel encounter={encounterDetail} />,
      pharmacy: <PharmacyPanel encounter={encounterDetail} />,
      'treatment-plan': <TreatmentPlanPanel encounter={encounterDetail} />,
      admissions: <AdmissionsPanel encounter={encounterDetail} />,
      billing: <BillingPanel encounter={encounterDetail} />,
      procedures: <ProceduresPanel encounter={encounterDetail} />,
      dental: <DentalPanel encounter={encounterDetail} />,
      ophthalmology: <OphthalmologyPanel encounter={encounterDetail} />,
      physiotherapy: <PhysiotherapyPanel encounter={encounterDetail} />,
    };

    return panelMap[activeModule] || <OverviewPanel encounter={encounterDetail} />;
  }, [activeModule, encounterDetail, isLoadingDetail]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="border-b border-gray-200 bg-slate-800 px-3 py-2 text-white">
        <div className="flex items-center gap-2">
          <User size={14} />
          <span className="text-xs font-bold uppercase tracking-wide">Patient Story</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50/50">
        {isLoadingPatient ? (
          <div className="border-b border-gray-200 bg-gray-50 px-3 py-3">
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">Loading patient...</span>
            </div>
          </div>
        ) : patient ? (
          <div className="border-b border-gray-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-bold text-gray-900">
                  {patient.title ? `${patient.title} ` : ''}
                  {patient.first_name} {patient.surname}
                </h4>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-600">
                  <span className="font-medium">
                    {formatDetailedAge(patient.date_of_birth)} {patient.gender?.charAt(0)}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="font-mono text-gray-500">{patient.emr_number}</span>
                  {patient.blood_group && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="font-bold text-red-600">
                        {patient.blood_group}
                        {patient.genotype ? `/${patient.genotype}` : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-700">
                {patient.patient_category || 'General'}
              </span>
            </div>

            {patient.allergies && patient.allergies.length > 0 && (
              <div className="mt-2 flex items-start gap-2 rounded border border-red-200 bg-red-50 px-2 py-1.5">
                <AlertTriangle size={12} className="mt-0.5 flex-shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-bold uppercase text-red-600">Allergies:</span>
                  <p className="truncate text-xs font-medium text-red-700">
                    {patient.allergies
                      .map((allergy) => (typeof allergy === 'string' ? allergy : allergy.allergen))
                      .join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/80 px-3 py-1.5">
          <button
            onClick={() => setShowQuickView((prev) => !prev)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${
              showQuickView ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
            }`}
          >
            <Activity size={10} />
            Quick View
          </button>
          <span className="text-[9px] text-gray-400">
            {encounters.length} encounter{encounters.length !== 1 ? 's' : ''}
          </span>
        </div>

        {showQuickView && (
          <div className="space-y-2 border-b border-gray-200 bg-white px-3 py-2">
            {latestVitals && (
              <div className="grid grid-cols-4 gap-1.5">
                {latestVitals.blood_pressure && (
                  <div className="rounded bg-rose-50 p-1.5 text-center">
                    <div className="text-[8px] font-bold uppercase text-rose-500">BP</div>
                    <div className="text-xs font-bold text-rose-700">
                      {latestVitals.blood_pressure.systolic}/{latestVitals.blood_pressure.diastolic}
                    </div>
                  </div>
                )}
                {latestVitals.pulse_rate && (
                  <div className="rounded bg-amber-50 p-1.5 text-center">
                    <div className="text-[8px] font-bold uppercase text-amber-500">Pulse</div>
                    <div className="text-xs font-bold text-amber-700">{latestVitals.pulse_rate}</div>
                  </div>
                )}
                {latestVitals.temperature && (
                  <div className="rounded bg-blue-50 p-1.5 text-center">
                    <div className="text-[8px] font-bold uppercase text-blue-500">Temp</div>
                    <div className="text-xs font-bold text-blue-700">{latestVitals.temperature}°C</div>
                  </div>
                )}
                {latestVitals.oxygen_saturation && (
                  <div className="rounded bg-green-50 p-1.5 text-center">
                    <div className="text-[8px] font-bold uppercase text-green-500">SpO₂</div>
                    <div className="text-xs font-bold text-green-700">{latestVitals.oxygen_saturation}%</div>
                  </div>
                )}
              </div>
            )}

            {currentMeds.length > 0 && (
              <div>
                <div className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase text-gray-500">
                  <Pill size={9} /> Recent Medications
                </div>
                <div className="space-y-0.5">
                  {currentMeds.slice(0, 3).map((med, index) => (
                    <div key={`${med.prescription_id}-${index}`} className="truncate rounded bg-green-50 px-2 py-0.5 text-xs text-gray-700">
                      <span className="font-medium">{med.drug_name}</span>
                      <span className="ml-1 text-gray-500">{med.dosage} {med.frequency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {encounterDetail?.lab_requests && encounterDetail.lab_requests.length > 0 && (
              <div>
                <div className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase text-gray-500">
                  <FlaskConical size={9} /> Recent Lab Requests
                </div>
                <div className="space-y-0.5">
                  {encounterDetail.lab_requests.slice(0, 3).map((lab, index) => (
                    <div key={`${lab.id || lab.request_id || index}`} className="truncate rounded bg-blue-50 px-2 py-0.5 text-xs text-gray-700">
                      <span className="font-medium">{lab.test_name || 'Lab Test'}</span>
                      <span
                        className={`ml-1 rounded px-1 text-[9px] ${
                          lab.status === 'Completed'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-yellow-100 text-yellow-600'
                        }`}
                      >
                        {lab.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-b border-gray-200 bg-slate-50/50 px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              disabled={currentIdx <= 0}
              className="rounded p-1 transition-colors hover:bg-gray-200 disabled:opacity-30"
            >
              <ChevronLeft size={12} />
            </button>
            <div className="relative flex-1">
              <button
                onClick={() => setShowEncDropdown((prev) => !prev)}
                className="flex w-full items-center justify-between gap-1 rounded bg-slate-700 px-2 py-1 text-xs text-white transition-colors hover:bg-slate-600"
              >
                <span className="min-w-0 text-left">
                  <span className="block truncate font-semibold">
                    {selectedEnc?.encounter_number || 'Select Encounter'}
                  </span>
                  {selectedEnc?.encounter_date && (
                    <span className="block truncate text-[10px] text-slate-200/90">
                      {formatEncounterDateLabel(selectedEnc.encounter_date)}
                    </span>
                  )}
                </span>
                <ChevronDown size={12} className={`transition-transform ${showEncDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showEncDropdown && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded border border-gray-200 bg-white shadow-xl">
                  {encounters.map((encounter) => (
                    <button
                      key={encounter.encounter_id}
                      onClick={() => {
                        setSelectedEncId(encounter.encounter_id);
                        setShowEncDropdown(false);
                      }}
                      className={`w-full border-b border-gray-50 px-2 py-1.5 text-left text-xs last:border-0 hover:bg-gray-50 ${
                        encounter.encounter_id === selectedEncId ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <span className="block font-semibold text-gray-800">{encounter.encounter_number}</span>
                          <span className="block text-[10px] text-gray-500">
                            {formatEncounterDateLabel(encounter.encounter_date)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={goNext}
              disabled={currentIdx < 0 || currentIdx >= encounters.length - 1}
              className="rounded p-1 transition-colors hover:bg-gray-200 disabled:opacity-30"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>

        <div className="border-b border-gray-200 bg-white px-3 py-2">
          <select
            value={activeModule}
            onChange={(event) => setActiveModule(event.target.value as StoryModule)}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {STORY_MODULES.map((mod) => (
              <option key={mod.id} value={mod.id}>
                {mod.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-gray-50/50 p-3">{modulePanel}</div>
      </div>
    </div>
  );
}
