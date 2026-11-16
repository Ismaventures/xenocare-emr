import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../api/supabaseClient';
import {
  Activity,
  ChevronLeft,
  FileText,
  Pill,
  Thermometer,
  ClipboardList,
  FlaskConical,
  Scan,
  Zap,
  BedDouble,
  Receipt,
  Syringe,
  Smile,
  Eye,
  Dumbbell,
  Printer,
  Download,
  Calendar,
  Users,
  AlertCircle,
  AlertTriangle,
  MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import DateRangePicker from './encounter-centric/DateRangePicker';
import { usePatientMedicalRecords, useEncounterDetails } from '../../hooks/useMedicalRecords';
import { EncounterSummary, EncounterDetail } from '../../api/medical-records.api';
import { Button } from '../../../../components/ui/FormElements';
import { ClinicalExportModal } from '../../../clinical-export/components/ClinicalExportModal';
import { EncounterQuickActions } from './EncounterQuickActions';
import { QuickOrderModal, OrderType } from './QuickOrderModal';
import { ClinicalNotesModal, type NoteType } from './ClinicalNotesModal';
import { EncounterContinuationContext } from '../../../../lib/encounter/continuation';
import type { WorkflowStage } from '../../../../lib/workflow/types';
import { useEncounterAccess } from '../../../../lib/encounter/useEncounterAccess';
import { OverviewPanel } from './encounter-centric/panels/OverviewPanel';
import { TimelinePanel } from './encounter-centric/panels/TimelinePanel';
import { VitalsPanel } from './encounter-centric/panels/VitalsPanel';
import { AllNotesPanel } from './encounter-centric/panels/AllNotesPanel';
import { LabsPanel } from './encounter-centric/panels/LabsPanel';
import { RadiologyPanel } from './encounter-centric/panels/RadiologyPanel';
import { PharmacyPanel } from './encounter-centric/panels/PharmacyPanel';
import { TreatmentPlanPanel } from './encounter-centric/panels/TreatmentPlanPanel';
import { AdmissionsPanel } from './encounter-centric/panels/AdmissionsPanel';
import { BillingPanel } from './encounter-centric/panels/BillingPanel';
import { OrdersPanel } from './encounter-centric/panels/OrdersPanel';
import { DentalPanel } from './encounter-centric/panels/DentalPanel';
import { OphthalmologyPanel } from './encounter-centric/panels/OphthalmologyPanel';
import { PhysiotherapyPanel } from './encounter-centric/panels/PhysiotherapyPanel';
import { ProceduresPanel } from './encounter-centric/panels/ProceduresPanel';
import { CareTeamTab } from './encounter-centric/panels/CareTeamTab';
import { SkeletonEncounterDetail } from '../../../../components/ui/SkeletonLoader';
import { EmptyState } from '../../../../components/ui/DataDisplay';

import {
  ModuleType,
} from './encounter-centric/SidebarNavigation';

// =============================================================================
// Main View Component
// =============================================================================

export function EncounterCentricView() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user, staff } = useAuth();

  // State
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(
    null,
  );
  const [selectedModule, setSelectedModule] = useState<ModuleType>('overview');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [noteModalType, setNoteModalType] = useState<NoteType>('progress_note');

  // Fetch Data
  const {
    data: patientData,
    isLoading: isLoadingPatient,
    error: patientError,
  } = usePatientMedicalRecords(patientId || null);

  const { data: encounterDetails, isLoading: isLoadingEncounter } =
    useEncounterDetails(selectedEncounterId);

  // Derived Data
  const encounters = patientData?.recent_encounters || [];

  // Compute which tabs are visible based on patient's department encounter history
  const { primaryTabs, overflowTabs } = useVisibleTabs(encounters);

  // Filter encounters by date range
  const filteredEncounters = useMemo(() => {
    let result = encounters;

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((e) => new Date(e.encounter_date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((e) => new Date(e.encounter_date) <= to);
    }

    // Sort most recent first
    return [...result].sort((a, b) =>
      new Date(b.encounter_date).getTime() - new Date(a.encounter_date).getTime()
    );
  }, [encounters, dateFrom, dateTo]);

  // Auto-select first encounter when filter changes IF current selection is invalid
  useEffect(() => {
    if (filteredEncounters.length > 0) {
      const currentStillValid = filteredEncounters.some(
        (e) => e.encounter_id === selectedEncounterId,
      );
      if (!currentStillValid) {
        setSelectedEncounterId(filteredEncounters[0].encounter_id);
      }
    }
  }, [filteredEncounters, selectedEncounterId]);

  const selectedEncounterSummary = useMemo(
    () => encounters.find((e) => e.encounter_id === selectedEncounterId),
    [encounters, selectedEncounterId],
  );

  // Check if patient has an active admission (admitted status)
  const { data: activeAdmission } = useQuery({
    queryKey: ['active-admission', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const { data } = await supabase
        .from('admissions')
        .select('id')
        .eq('patient_id', patientId)
        .eq('admission_status', 'admitted')
        .maybeSingle();
      return data;
    },
    enabled: !!patientId,
    staleTime: 30_000,
  });

  const hasActiveAdmission = !!activeAdmission;

  // --- Care-team access check for the selected encounter ---
  const {
    canEdit: careTeamCanEdit,
    canView: careTeamCanView,
    isLoading: accessLoading,
  } = useEncounterAccess({
    encounterId: selectedEncounterId || '',
    enabled: !!selectedEncounterId,
  });

  // Build encounter context for modals
  const encounterContext: EncounterContinuationContext | null = useMemo(() => {
    if (!selectedEncounterSummary || !patientId) return null;
    return {
      encounterId: selectedEncounterSummary.encounter_id,
      patientId,
      currentStage: 'doctor_consultation' as WorkflowStage,
      status: selectedEncounterSummary.status || 'Active',
      createdAt: selectedEncounterSummary.encounter_date,
      encounterType: (selectedEncounterSummary.visit_type === 'In-Patient'
        ? 'In-Patient'
        : selectedEncounterSummary.visit_type === 'Emergency'
          ? 'Emergency'
          : 'OPD') as 'OPD' | 'In-Patient' | 'Emergency',
      hasUnresolvedResults: false,
      consultationCount: 1,
      hasActiveAdmission,
    };
  }, [selectedEncounterSummary, patientId, hasActiveAdmission]);

  // Determine if Add Note / Add Order actions are allowed
  // Rules: Must be on care team with edit permissions AND (admitted OR within 24hrs)
  const canAddNotesOrOrders = useMemo(() => {
    if (!selectedEncounterSummary) return false;

    // --- Care team gate: must have edit permission on this encounter ---
    if (!careTeamCanEdit) return false;

    // Patient is admitted — always allow
    if (hasActiveAdmission) return true;

    const encounterDate = new Date(selectedEncounterSummary.encounter_date);
    const now = new Date();
    const hoursSinceEncounter =
      (now.getTime() - encounterDate.getTime()) / (1000 * 60 * 60);
    const isWithin24Hours = hoursSinceEncounter <= 24;

    const status = (selectedEncounterSummary.status || '').toLowerCase();
    const isAdmitted =
      status === 'admitted' ||
      status === 'active' ||
      status === 'in-progress' ||
      status === 'in_progress';
    const isDischarged =
      status === 'discharged' || status === 'completed' || status === 'closed';

    // Admitted patients can always add notes/orders
    if (isAdmitted) return true;
    // Discharged patients cannot
    if (isDischarged) return false;
    // For other statuses, allow within 24hrs
    return isWithin24Hours;
  }, [selectedEncounterSummary, careTeamCanEdit, hasActiveAdmission]);

  // Default module selection logic
  useEffect(() => {
    if (encounters.length > 0 && !selectedEncounterId) {
      setSelectedEncounterId(encounters[0].encounter_id);
    }
  }, [encounters, selectedEncounterId]);

  // Handlers
  const handleBack = useCallback(() => navigate(-1), [navigate]);
  const handleSelectEncounter = useCallback((id: string) => {
    setSelectedEncounterId(id);
    setSelectedModule('overview');
  }, []);

  if (isLoadingPatient) return <SkeletonEncounterDetail />;

  if (patientError || !patientData?.patient) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-red-500" size={28} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Patient Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">The patient record could not be loaded. It may have been removed or you may not have access.</p>
          <Button onClick={handleBack} className="mt-2">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const {patient} = patientData;

  // Calculate age display
  const ageDisplay = typeof patient.age === 'number'
    ? `${patient.age} Yrs`
    : patient.age || 'N/A';

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col font-sans">
      {/*
        ==========================================
        Patient Profile Card — Design-system inspired
        Ant Design description list + Shadcn elevation + NHS.UK accessibility
        ==========================================
      */}
      <div className="flex-shrink-0 z-20 bg-gray-50 px-5 pt-4 pb-1">
        <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] border border-gray-200/60 overflow-hidden">

          {/* ── Row 1: Identity bar ── */}
          <div className="flex items-center gap-4 px-7 py-5">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-700 transition flex-shrink-0 -ml-2"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="w-[52px] h-[52px] rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-sm">
              {patient.first_name?.[0]}{patient.surname?.[0]}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-bold text-gray-900 leading-tight tracking-tight">
                {patient.title ? `${patient.title} ` : ''}{patient.first_name} {patient.middle_name ? `${patient.middle_name} ` : ''}{patient.surname}
              </h1>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="font-mono bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-xl text-xs font-bold tracking-wide">
                {patient.emr_number}
              </span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                patient.status === 'active' || !patient.status
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {patient.status ? patient.status.charAt(0).toUpperCase() + patient.status.slice(1) : 'Active'}
              </span>
              <div className="w-px h-6 bg-gray-200" />
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
                title="Print / Export"
              >
                <Printer size={17} />
              </button>
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm"
              >
                <Download size={14} />
                Export
              </button>
            </div>
          </div>

          {/* ── Row 2: Demographics + clinical tags — description list (Ant Design pattern) ── */}
          <div className="border-t border-gray-100 px-7 py-4">
            <dl className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-3">
              <div>
                <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Gender</dt>
                <dd className="text-sm font-semibold text-gray-800">{patient.gender || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Age</dt>
                <dd className="text-sm font-semibold text-gray-800">{ageDisplay || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Date of Birth</dt>
                <dd className="text-sm font-semibold text-gray-800">
                  {patient.date_of_birth
                    ? new Date(patient.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Phone</dt>
                <dd className="text-sm font-semibold text-gray-800">{patient.contact_phone || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Blood Group</dt>
                <dd className="text-sm font-bold text-red-700">{patient.blood_group || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Genotype</dt>
                <dd className="text-sm font-bold text-purple-700">{patient.genotype || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">NHIS</dt>
                <dd className="text-sm font-semibold text-blue-700">{patient.nhis_number || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Category</dt>
                <dd className="text-sm font-semibold text-gray-800">{patient.patient_category || 'General'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Last Visit</dt>
                <dd className="text-sm font-semibold text-gray-800">
                  {encounters[0]
                    ? new Date(encounters[0].encounter_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'N/A'}
                </dd>
              </div>
              {patient.allergies && patient.allergies.length > 0 && (
                <div>
                  <dt className="text-[11px] font-medium text-amber-500 uppercase tracking-wider mb-1">Allergies</dt>
                  <dd className="text-sm font-bold text-amber-800">{patient.allergies.map((a) => a.allergen).join(', ')}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Wrapper — full width, no sidebar */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* ── Encounter selector + date filter ── */}
          <div className="mx-5 mt-3 flex flex-shrink-0 items-center gap-3 rounded-xl bg-white border border-gray-200/60 px-4 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            {/* Encounter picker */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
                  <Calendar size={15} />
                </div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:inline">Encounter</span>
                <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums">
                  {filteredEncounters.length}
                </span>
              </div>
              <select
                value={selectedEncounterId || ''}
                onChange={(e) => {
                  if (e.target.value) handleSelectEncounter(e.target.value);
                }}
                aria-label="Select encounter"
                className="flex-1 min-w-0 max-w-[400px] bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-gray-800 hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition cursor-pointer truncate"
              >
                {filteredEncounters.length === 0 && (
                  <option value="">No encounters found</option>
                )}
                {filteredEncounters.map((enc) => {
                  const date = new Date(enc.encounter_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  const parts = [enc.encounter_number, '—', date];
                  if (enc.visit_type) parts.push(`· ${enc.visit_type}`);
                  if (enc.status) parts.push(`· ${enc.status}`);
                  return (
                    <option key={enc.encounter_id} value={enc.encounter_id}>
                      {parts.join(' ')}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Divider */}
            <div className="w-px h-7 bg-gray-200 flex-shrink-0" />

            {/* Date range filter — Google Calendar style */}
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          </div>

          {/* ── Horizontal Tab Bar (replaces scroll-only sidebar for quick switching) ── */}
          <HorizontalTabBar
            activeModule={selectedModule}
            onChange={(m) => setSelectedModule(m)}
            primaryTabs={primaryTabs}
            overflowTabs={overflowTabs}
          />

          {/* Scrollable Module Content */}
          <div
            id={`panel-${selectedModule}`}
            role="tabpanel"
            aria-label={selectedModule}
            className="flex-1 overflow-y-auto px-5 pb-6 pt-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
          >
            {isLoadingEncounter ? (
              <div className="space-y-4 animate-pulse">
                {/* Skeleton: mimics overview panel structure */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="h-2.5 bg-gray-200 rounded w-16 mb-3" />
                      <div className="h-5 bg-gray-100 rounded w-24" />
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-32" />
                  <div className="h-2.5 bg-gray-100 rounded w-full" />
                  <div className="h-2.5 bg-gray-100 rounded w-5/6" />
                  <div className="h-2.5 bg-gray-100 rounded w-4/6" />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-28" />
                  <div className="h-2.5 bg-gray-100 rounded w-full" />
                  <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ) : encounterDetails ? (
              // Render the active module
              <ModulePanel
                selectedModule={selectedModule}
                encounter={encounterDetails}
                onAddAddendum={() => {
                  setNoteModalType('addendum');
                  setShowNotesModal(true);
                }}
                onAddNote={() => {
                  setNoteModalType('progress_note');
                  setShowNotesModal(true);
                }}
                onAddOrder={() => setShowOrderModal(true)}
                canAddNotesOrOrders={canAddNotesOrOrders}
              />
            ) : (
              <EmptyState
                icon={Calendar}
                title="No Encounter Selected"
                description="Select an encounter from the dropdown above to view clinical details, notes, and orders."
              />
            )}
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {showOrderModal && selectedEncounterId && encounterContext && (
        <QuickOrderModal
          isOpen={showOrderModal}
          onClose={() => setShowOrderModal(false)}
          encounterId={selectedEncounterId}
          encounterNumber={selectedEncounterSummary?.encounter_number || ''}
          patientId={patientId || ''}
          patientName={`${patient.first_name} ${patient.surname}`}
          encounterContext={encounterContext}
          onOrdersCreated={() => {
            setShowOrderModal(false);
          }}
        />
      )}

      {/* Notes Modal */}
      {showNotesModal &&
        selectedEncounterId &&
        encounterContext &&
        encounterDetails && (
          <ClinicalNotesModal
            isOpen={showNotesModal}
            onClose={() => {
              setShowNotesModal(false);
              setNoteModalType('progress_note');
            }}
            encounterId={selectedEncounterId}
            encounterNumber={selectedEncounterSummary?.encounter_number || ''}
            visitId={encounterDetails.visit_id || ''}
            patientId={patientId || ''}
            patientName={`${patient.first_name} ${patient.surname}`}
            encounterContext={encounterContext}
            clinicId={encounterDetails.clinic_id || null}
            initialNoteType={noteModalType}
            onNoteAdded={() => {
              setShowNotesModal(false);
              setNoteModalType('progress_note');
            }}
          />
        )}

      {/* Export Modal */}
      <ClinicalExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        patientId={patientId || ''}
        patientName={`${patientData.patient.first_name} ${patientData.patient.surname}`}
        emrNumber={patientData.patient.emr_number}
        userId={user?.id || ''}
        userName={user?.email || 'System User'}
        userRole={staff?.role || 'Doctor'}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Definitions — single source of truth for all navigation items
// ─────────────────────────────────────────────────────────────────────────────

type TabDef = { id: ModuleType; label: string; icon: React.ElementType };

/** Tabs that always show (core clinical workflow). */
const ALWAYS_VISIBLE_TABS: TabDef[] = [
  { id: 'overview',        label: 'Overview',        icon: Activity },
  { id: 'all-notes',       label: 'Clinical Notes',  icon: FileText },
  { id: 'vitals',          label: 'Vitals',           icon: Thermometer },
  { id: 'orders',          label: 'Orders',           icon: ClipboardList },
  { id: 'pharmacy',        label: 'Pharmacy',         icon: Pill },
  { id: 'labs',            label: 'Laboratory',       icon: FlaskConical },
  { id: 'radiology',       label: 'Radiology',        icon: Scan },
  { id: 'procedures',      label: 'Procedures',       icon: Syringe },
  { id: 'treatment-plan',  label: 'Treatment Plan',   icon: Zap },
  { id: 'billing',         label: 'Financials',       icon: Receipt },
  { id: 'timeline',        label: 'Timeline',         icon: Calendar },
  { id: 'care-team',       label: 'Care Team',        icon: Users },
];

/**
 * Tabs that only appear when the patient has encounter records with that
 * department/clinic. Keys are matched case-insensitively against
 * EncounterSummary.clinic_name, doctor.specialty, and visit_type.
 */
const CONDITIONAL_TABS: (TabDef & { matchKeywords: string[] })[] = [
  { id: 'admissions',     label: 'Ward / Bed',      icon: BedDouble,  matchKeywords: ['in-patient', 'inpatient', 'ward', 'admission'] },
  { id: 'dental',         label: 'Dental',          icon: Smile,      matchKeywords: ['dental', 'dentistry'] },
  { id: 'ophthalmology',  label: 'Ophthalmology',   icon: Eye,        matchKeywords: ['ophthalmology', 'eye clinic', 'ophthal'] },
  { id: 'physiotherapy',  label: 'Physiotherapy',    icon: Dumbbell,   matchKeywords: ['physiotherapy', 'physio', 'rehabilitation', 'rehab'] },
];

/** Number of tabs shown inline before the rest go into "More" dropdown. */
const MAX_INLINE_TABS = 9;

/**
 * Derive the set of department keywords from the patient's encounter history.
 */
function buildPatientDeptKeywords(encounters: EncounterSummary[]): Set<string> {
  const keywords = new Set<string>();
  for (const e of encounters) {
    if (e.clinic_name) keywords.add(e.clinic_name.toLowerCase());
    if (e.doctor?.specialty) keywords.add(e.doctor.specialty.toLowerCase());
    if (e.visit_type) keywords.add(e.visit_type.toLowerCase());
  }
  return keywords;
}

/**
 * Returns the filtered primary (inline) and overflow ("More") tabs
 * based on the patient's encounter history.
 */
function useVisibleTabs(encounters: EncounterSummary[]) {
  return useMemo(() => {
    const deptKeywords = buildPatientDeptKeywords(encounters);

    // Filter conditional tabs: include only those matching patient history
    const activeConditional = CONDITIONAL_TABS.filter((tab) =>
      tab.matchKeywords.some((kw) => {
        for (const dept of deptKeywords) {
          if (dept.includes(kw) || kw.includes(dept)) return true;
        }
        return false;
      }),
    );

    const allVisible: TabDef[] = [...ALWAYS_VISIBLE_TABS, ...activeConditional];
    const primary = allVisible.slice(0, MAX_INLINE_TABS);
    const overflow = allVisible.slice(MAX_INLINE_TABS);

    return { primaryTabs: primary, overflowTabs: overflow };
  }, [encounters]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Horizontal Tab Bar
// ─────────────────────────────────────────────────────────────────────────────

function HorizontalTabBar({
  activeModule,
  onChange,
  primaryTabs,
  overflowTabs,
}: {
  activeModule: ModuleType;
  onChange: (m: ModuleType) => void;
  primaryTabs: TabDef[];
  overflowTabs: TabDef[];
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false);
    }
    if (moreOpen) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreOpen]);

  const activeOverflowTab = overflowTabs.find((t) => t.id === activeModule);

  return (
    <div className="mx-5 mt-2 flex-shrink-0">
      <div className="relative flex items-center bg-white border border-gray-200/60 rounded-xl px-1.5 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        {/* Primary tabs with ARIA tablist */}
        <div role="tablist" aria-label="Clinical modules" className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {primaryTabs.map((tab) => {
            const isActive = activeModule === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
                  ${isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Divider + More dropdown */}
        {overflowTabs.length > 0 && (
          <div className="flex items-center flex-shrink-0">
            <div className="w-px h-5 bg-gray-200 mx-1.5" />
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
                  ${activeOverflowTab
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                <MoreHorizontal size={14} />
                {activeOverflowTab ? activeOverflowTab.label : 'More'}
              </button>

              {moreOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5"
                >
                  {overflowTabs.map((tab) => {
                    const isActive = activeModule === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        role="menuitem"
                        onClick={() => {
                          onChange(tab.id);
                          setMoreOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors
                          ${isActive
                            ? 'bg-emerald-50 text-emerald-700 font-semibold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                      >
                        <Icon size={15} className={isActive ? 'text-emerald-600' : 'text-gray-400'} />
                        {tab.label}
                        {isActive && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Panel Renderer
function ModulePanel({
  selectedModule,
  encounter,
  onAddAddendum,
  onAddNote,
  onAddOrder,
  canAddNotesOrOrders,
}: {
  selectedModule: ModuleType;
  encounter: EncounterDetail;
  onAddAddendum?: () => void;
  onAddNote?: () => void;
  onAddOrder?: () => void;
  canAddNotesOrOrders?: boolean;
}) {
  const navigate = useNavigate();

  switch (selectedModule) {
    case 'overview': return <OverviewPanel encounter={encounter} />;
    case 'timeline': return <TimelinePanel encounter={encounter} />;
    case 'vitals': return <VitalsPanel encounter={encounter} />;
    case 'all-notes': return (
      <AllNotesPanel
        encounter={encounter}
        onAddAddendum={onAddAddendum}
        onAddNote={onAddNote}
        onAddOrder={onAddOrder}
        canAddNotesOrOrders={canAddNotesOrOrders}
      />
    );
    case 'orders': return <OrdersPanel encounter={encounter} />;
    case 'labs': return <LabsPanel encounter={encounter} onBack={() => navigate(-1)} />;
    case 'radiology': return <RadiologyPanel encounter={encounter} />;
    case 'pharmacy': return <PharmacyPanel encounter={encounter} />;
    case 'treatment-plan': return <TreatmentPlanPanel encounter={encounter} />;
    case 'admissions': return <AdmissionsPanel encounter={encounter} />;
    case 'billing': return <BillingPanel encounter={encounter} />;
    case 'dental': return <DentalPanel encounter={encounter} />;
    case 'ophthalmology': return <OphthalmologyPanel encounter={encounter} />;
    case 'physiotherapy': return <PhysiotherapyPanel encounter={encounter} />;
    case 'procedures': return <ProceduresPanel encounter={encounter} />;
    case 'care-team': return <CareTeamTab encounter={encounter} />;
    default: return <OverviewPanel encounter={encounter} />;
  }
}

export default EncounterCentricView;
