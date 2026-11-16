/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - PATIENT MEDICAL RECORDS PAGE
 * Main page integrating all medical records components
 * Responsive layout: Desktop (3-col), Tablet (2-col), Mobile (accordion)
 * =============================================================================
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  Menu,
  X,
  Loader,
  AlertTriangle,
  ClipboardList,
  Download,
  FileText,
  Filter,
} from 'lucide-react';

import { PatientStickyHeader } from './PatientStickyHeader';
import { PatientStoryPanel } from './PatientStoryPanel';
import type { TimeFilterValue } from './PatientStoryPanel';
import { MainRecordsPanel } from './MainRecordsPanel';
import { EncounterDetailModal } from './EncounterDetailModal';
import { ClinicalExportModal } from '../../../clinical-export';

import {
  usePatientMedicalRecords,
  usePatientEncountersInfinite,
  useEncountersByProblemInfinite,
} from '../../hooks/useMedicalRecords';
import {
  PatientProblem,
  MedicalRecordsFilters,
} from '../../api/medical-records.api';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  createTraceId,
  estimatePayloadBytes,
  logOperationDuration,
  logOperationSummary,
  toMetricKey,
} from '../../../../utils/observability';

// =============================================================================
// Types
// =============================================================================

interface MedicalRecordsPageProps {
  patientId?: string; // Can be passed as prop or from URL params
}

// =============================================================================
// Main Component
// =============================================================================

export function MedicalRecordsPage({
  patientId: propPatientId,
}: MedicalRecordsPageProps) {
  const renderStartedAt = performance.now();
  const { patientId: urlPatientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, staff } = useAuth();

  // Get patient ID from props or URL
  const patientId = propPatientId || urlPatientId;
  const pageTraceIdRef = useRef(
    createTraceId('MedicalRecordsUI', 'MedicalRecordsPage'),
  );
  const pageLoadStartedAtRef = useRef(performance.now());
  const renderPassCountRef = useRef(0);
  const uiStepMetricsRef = useRef<Record<string, number>>({});
  const didLogReadyRef = useRef(false);

  // State
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>('all');
  const [selectedProblem, setSelectedProblem] = useState<PatientProblem | null>(
    null,
  );
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(
    null,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Build filters
  const filters: MedicalRecordsFilters = useMemo(() => {
    return {
      timeframe: timeFilter,
      problem_id: selectedProblem?.id,
    };
  }, [timeFilter, selectedProblem]);

  // Fetch patient medical records summary
  const {
    data: patientData,
    isLoading: isLoadingPatient,
    error: patientError,
  } = usePatientMedicalRecords(patientId || null);

  // Fetch encounters with infinite scroll
  // Use problem-filtered query when a problem is selected
  const encountersQuery = selectedProblem
    ? useEncountersByProblemInfinite(patientId || null, selectedProblem.name)
    : usePatientEncountersInfinite(patientId || null, filters);

  const {
    data: encountersData,
    isLoading: isLoadingEncounters,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = encountersQuery;

  // Flatten paginated encounters
  const encounters = useMemo(() => {
    const startedAt = performance.now();
    if (!encountersData?.pages) {
      const durationMs = performance.now() - startedAt;
      uiStepMetricsRef.current[toMetricKey('flatten_encounters')] =
        Math.round(durationMs);
      logOperationDuration({
        module: 'MedicalRecordsUI',
        action: 'MedicalRecordsPage',
        step: 'flatten_encounters',
        duration_ms: durationMs,
        trace_id: pageTraceIdRef.current,
        patient_id: patientId || undefined,
        payload_bytes: 0,
        encounter_count: 0,
      });
      return [];
    }
    const flattened = encountersData.pages.flatMap((page) => page.encounters);
    const durationMs = performance.now() - startedAt;
    uiStepMetricsRef.current[toMetricKey('flatten_encounters')] =
      Math.round(durationMs);
    logOperationDuration({
      module: 'MedicalRecordsUI',
      action: 'MedicalRecordsPage',
      step: 'flatten_encounters',
      duration_ms: durationMs,
      trace_id: pageTraceIdRef.current,
      patient_id: patientId || undefined,
      payload_bytes: estimatePayloadBytes(flattened),
      encounter_count: flattened.length,
      page_count: encountersData.pages.length,
    });
    return flattened;
  }, [encountersData, patientId]);

  useEffect(() => {
    const durationMs = performance.now() - renderStartedAt;
    renderPassCountRef.current += 1;
    uiStepMetricsRef.current[toMetricKey('render_commit')] =
      Math.round(durationMs);

    logOperationDuration({
      module: 'MedicalRecordsUI',
      action: 'MedicalRecordsPage',
      step: 'render_commit',
      duration_ms: durationMs,
      trace_id: pageTraceIdRef.current,
      patient_id: patientId || undefined,
      render_pass: renderPassCountRef.current,
      encounter_count: encounters.length,
      selected_problem_id: selectedProblem?.id || null,
      is_loading_patient: isLoadingPatient,
      is_loading_encounters: isLoadingEncounters,
      is_fetching_next_page: isFetchingNextPage,
    });
  }, [
    encounters.length,
    isFetchingNextPage,
    isLoadingEncounters,
    isLoadingPatient,
    patientId,
    selectedProblem?.id,
    renderStartedAt,
  ]);

  useEffect(() => {
    if (didLogReadyRef.current) return;
    if (!patientData || isLoadingPatient || isLoadingEncounters) return;

    didLogReadyRef.current = true;
    const totalReadyMs = performance.now() - pageLoadStartedAtRef.current;
    logOperationSummary({
      module: 'MedicalRecordsUI',
      action: 'MedicalRecordsPage',
      total_duration_ms: totalReadyMs,
      trace_id: pageTraceIdRef.current,
      patient_id: patientId || undefined,
      encounter_count: encounters.length,
      ...uiStepMetricsRef.current,
    });
  }, [
    encounters.length,
    isLoadingEncounters,
    isLoadingPatient,
    patientData,
    patientId,
  ]);

  // Handlers
  const handleTimeFilterChange = useCallback((filter: TimeFilterValue) => {
    setTimeFilter(filter);
    setSelectedProblem(null); // Reset problem selection when time filter changes
  }, []);

  const handleProblemSelect = useCallback((problem: PatientProblem | null) => {
    setSelectedProblem(problem);
  }, []);

  const handleEncounterClick = useCallback((encounterId: string) => {
    setSelectedEncounterId(encounterId);
    setIsDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedEncounterId(null);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Error state
  if (!patientId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Patient Selected
          </h2>
          <p className="text-gray-500 mb-4">
            Please select a patient to view their medical records.
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingPatient) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader
            size={40}
            className="mx-auto animate-spin text-primary-700 mb-4"
          />
          <p className="text-gray-500">Loading patient records...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (patientError || !patientData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Failed to Load Records
          </h2>
          <p className="text-gray-500 mb-4">
            {patientError?.message ||
              'An error occurred while loading patient records.'}
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <div className="hidden items-center justify-between border-b border-slate-200/90 bg-white p-4 shadow-sm lg:flex">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 transition-colors hover:bg-emerald-50 hover:text-primary-800"
          >
            <ChevronLeft size={20} />
            <span className="font-semibold">Back</span>
          </button>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Medical history
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-primary-700 px-4 py-2 text-sm font-semibold text-primary-800 transition-colors hover:bg-emerald-50"
          >
            <Download size={18} />
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => navigate(`/patient/${patientId}/encounters`)}
            className="flex items-center gap-2 rounded-xl bg-primary-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-800"
          >
            <ClipboardList size={18} />
            Encounter view
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-slate-200/90 bg-white p-4 shadow-sm lg:hidden">
        <button
          onClick={handleBack}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-slate-900">
          Medical history
        </h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="p-2 text-primary-700 hover:bg-green-50 rounded-lg"
            title="Export Records"
          >
            <Download size={20} />
          </button>
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Export Quick Action Bar */}
      <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-emerald-50/90 to-teal-50/80 px-4 py-2 lg:hidden">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-primary-800" />
          <span className="text-sm font-semibold text-slate-800">
            Export patient records
          </span>
        </div>
        <button
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
        >
          <Download size={14} />
          <span>Export PDF</span>
        </button>
      </div>

      {/* Sticky Patient Header */}
      <PatientStickyHeader
        patient={patientData.patient}
        latestVitals={patientData.latest_vitals}
        currentMedications={patientData.current_medications || []}
        problems={patientData.problems || []}
        encounterStats={{
          total: patientData.stats?.total_encounters || 0,
          activeProblems: patientData.stats?.active_problems || 0,
          labCount: patientData.stats?.total_lab_tests || 0,
          rxCount: patientData.stats?.total_prescriptions || 0,
        }}
      />

      {/* Main Content - Simplified Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: Left Sidebar - Fixed width, internal scroll */}
        <div className="hidden w-72 flex-shrink-0 border-r border-slate-200/90 bg-white lg:flex lg:flex-col">
          <PatientStoryPanel
            problems={patientData.problems}
            latestVitals={patientData.latest_vitals}
            currentMedications={patientData.current_medications}
            stats={patientData.stats}
            selectedTimeFilter={timeFilter}
            onTimeFilterChange={handleTimeFilterChange}
            selectedProblem={selectedProblem}
            onProblemSelect={handleProblemSelect}
            onExportClick={() => setIsExportModalOpen(true)}
            showExportSection
          />
        </div>

        {/* Mobile: Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/30 z-30"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="lg:hidden fixed left-0 top-0 h-full w-72 max-w-[85vw] bg-white z-40 shadow-xl overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                  Clinical Overview
                </h2>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Export Section in Sidebar */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={18} className="text-primary-700" />
                  <h3 className="font-semibold text-gray-900">
                    Export Records
                  </h3>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  Generate comprehensive patient reports in PDF, Excel, CSV or
                  JSON format with customizable filters.
                </p>
                <button
                  onClick={() => {
                    setIsExportModalOpen(true);
                    setIsMobileSidebarOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-700 text-white font-medium rounded-lg hover:bg-primary-800 transition-colors shadow-sm"
                >
                  <Download size={16} />
                  <span>Open Export Options</span>
                </button>
                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Filter size={12} />
                    <span>Filter by date, category & module</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText size={12} />
                    <span>
                      Include: Labs, Radiology, Vitals, Billing & more
                    </span>
                  </div>
                </div>
              </div>

              <PatientStoryPanel
                problems={patientData.problems}
                latestVitals={patientData.latest_vitals}
                currentMedications={patientData.current_medications}
                stats={patientData.stats}
                selectedTimeFilter={timeFilter}
                onTimeFilterChange={(filter: TimeFilterValue) => {
                  handleTimeFilterChange(filter);
                  setIsMobileSidebarOpen(false);
                }}
                selectedProblem={selectedProblem}
                onProblemSelect={(problem: PatientProblem | null) => {
                  handleProblemSelect(problem);
                  setIsMobileSidebarOpen(false);
                }}
                showExportSection={false}
              />
            </div>
          </>
        )}

        {/* Main Records Panel - Takes remaining space */}
        <MainRecordsPanel
          encounters={encounters}
          selectedProblem={selectedProblem}
          latestVitals={patientData.latest_vitals}
          currentMedications={patientData.current_medications}
          isLoading={isLoadingEncounters || isFetchingNextPage}
          hasMore={!!hasNextPage}
          onLoadMore={handleLoadMore}
          onEncounterClick={handleEncounterClick}
        />
      </div>

      {/* Encounter Detail Modal - Now a professional centered popup */}
      <EncounterDetailModal
        encounterId={selectedEncounterId}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
      />

      {/* Clinical Export Modal */}
      <ClinicalExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        patientId={patientId}
        patientName={
          patientData?.patient
            ? `${patientData.patient.first_name || ''} ${patientData.patient.surname || ''}`.trim()
            : undefined
        }
        emrNumber={
          patientData?.patient?.emr_number || patientData?.patient?.patient_id
        }
        userId={staff?.id || user?.id || ''}
        userName={
          staff
            ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
            : user?.email || 'Unknown'
        }
        userRole={staff?.role || 'User'}
      />
    </div>
  );
}

export default MedicalRecordsPage;
