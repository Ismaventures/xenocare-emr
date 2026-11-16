/**
 * =============================================================================
 * XENOCARE EMR - ENCOUNTER TIMELINE PANEL
 * Clean encounter list without sidebar - patient profile is in sticky header
 * Each encounter shows: Date, Visit Type/Category, Chief Complaint, Status
 * =============================================================================
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { ChevronDown, ChevronRight, Loader, AlertCircle } from 'lucide-react';
import {
  EncounterSummary,
  PatientProblem,
  VitalSnapshot,
  MedicationSummary,
  EncounterDetail,
} from '../../api/medical-records.api';
import { useEncounterDetails } from '../../hooks/useMedicalRecords';

// =============================================================================
// Types
// =============================================================================

interface MainRecordsPanelProps {
  encounters: EncounterSummary[];
  selectedProblem: PatientProblem | null;
  latestVitals?: VitalSnapshot;
  currentMedications: MedicationSummary[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onEncounterClick: (encounterId: string) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(dateString: string): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

// =============================================================================
// Encounter Card - Clean Timeline Item with Visit Category
// =============================================================================

function EncounterCard({
  encounter,
  isExpanded,
  onToggle,
  onViewDetails,
}: {
  encounter: EncounterSummary;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: () => void;
}) {
  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div
        onClick={onToggle}
        className="cursor-pointer px-4 py-4 transition-colors hover:bg-slate-50/90 sm:px-5"
      >
        {/* Row 1: Date | Visit Type/Category | Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            {/* Date with relative time */}
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-slate-900 [text-rendering:optimizeLegibility]">
                {formatDate(encounter.encounter_date)}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {getRelativeTime(encounter.encounter_date)}
              </span>
            </div>

            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-800">
              {encounter.visit_type}
            </span>
          </div>

          {/* Right: Status + Expand */}
          <div className="flex items-center gap-3">
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                encounter.status === 'Completed'
                  ? 'bg-emerald-100 text-emerald-900'
                  : encounter.status === 'Active'
                    ? 'bg-sky-100 text-sky-950'
                    : 'bg-slate-100 text-slate-800'
              }`}
            >
              {encounter.status}
            </span>
            {isExpanded ? (
              <ChevronDown size={18} className="text-primary-700" />
            ) : (
              <ChevronRight size={18} className="text-gray-400" />
            )}
          </div>
        </div>

        {/* Row 2: Doctor (if available) */}
        {encounter.doctor?.name && (
          <p className="mb-2 text-sm text-slate-600">
            {encounter.doctor.name}
            {encounter.doctor.specialty && (
              <span className="text-slate-500">
                {' '}
                · {encounter.doctor.specialty}
              </span>
            )}
          </p>
        )}

        {encounter.chief_complaint && (
          <p className="mb-2 line-clamp-2 text-sm leading-relaxed text-slate-800">
            {encounter.chief_complaint}
          </p>
        )}

        {/* Row 4: Diagnoses (if any) */}
        {encounter.diagnoses.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {encounter.diagnoses.slice(0, 2).map((diag, idx) => (
              <span
                key={idx}
                className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-950"
              >
                {diag}
              </span>
            ))}
            {encounter.diagnoses.length > 2 && (
              <span className="text-xs text-gray-400">
                +{encounter.diagnoses.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Row 5: Quick counts */}
        {(encounter.has_prescriptions ||
          encounter.has_labs ||
          encounter.has_imaging) && (
          <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t border-gray-50">
            {encounter.has_prescriptions && (
              <span>{encounter.prescription_count} prescriptions</span>
            )}
            {encounter.has_labs && <span>{encounter.lab_count} labs</span>}
            {encounter.has_imaging && (
              <span>{encounter.imaging_count} imaging</span>
            )}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <ExpandedContent
          encounterId={encounter.encounter_id}
          onViewDetails={onViewDetails}
        />
      )}
    </div>
  );
}

// =============================================================================
// Expanded Content - Progressive Disclosure (Tab-Based)
// =============================================================================

function ExpandedContent({
  encounterId,
  onViewDetails,
}: {
  encounterId: string;
  onViewDetails: () => void;
}) {
  const {
    data: encounter,
    isLoading,
    error,
  } = useEncounterDetails(encounterId);
  const [activeTab, setActiveTab] = useState<
    'notes' | 'meds' | 'tests' | 'plan' | null
  >(null);

  if (isLoading) {
    return (
      <div className="px-5 py-8 border-t border-gray-100 flex items-center justify-center">
        <Loader size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !encounter) {
    return (
      <div className="px-5 py-6 border-t border-gray-100 text-center text-gray-500">
        <AlertCircle size={20} className="mx-auto mb-2 text-gray-400" />
        <p className="text-sm">Unable to load details</p>
      </div>
    );
  }

  const meds = encounter.medications || encounter.prescriptions || [];
  const labs = encounter.lab_results || encounter.lab_requests || [];
  const imaging =
    encounter.imaging_results || encounter.radiology_requests || [];
  const procedures = encounter.procedure_results || [];
  const hasNotes =
    encounter.consultation?.history_of_present_illness ||
    encounter.consultation?.diagnosis;
  const hasPlan = encounter.consultation?.treatment_plan;

  return (
    <div className="border-t border-gray-100">
      {/* Vitals Row (compact) */}
      {encounter.vitals && (
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex gap-6 text-sm text-gray-600">
          {encounter.vitals.blood_pressure && (
            <span>
              BP{' '}
              <span className="font-medium text-gray-900">
                {typeof encounter.vitals.blood_pressure === 'object'
                  ? `${encounter.vitals.blood_pressure.systolic}/${encounter.vitals.blood_pressure.diastolic}`
                  : encounter.vitals.blood_pressure}
              </span>
            </span>
          )}
          {encounter.vitals.pulse_rate && (
            <span>
              HR{' '}
              <span className="font-medium text-gray-900">
                {encounter.vitals.pulse_rate}
              </span>
            </span>
          )}
          {encounter.vitals.temperature && (
            <span>
              Temp{' '}
              <span className="font-medium text-gray-900">
                {encounter.vitals.temperature}°C
              </span>
            </span>
          )}
          {encounter.vitals.oxygen_saturation && (
            <span>
              SpO₂{' '}
              <span className="font-medium text-gray-900">
                {encounter.vitals.oxygen_saturation}%
              </span>
            </span>
          )}
        </div>
      )}

      {/* Tab Buttons */}
      <div className="px-5 py-3 bg-white border-b border-gray-100">
        <div className="flex flex-wrap gap-2">
          {hasNotes && (
            <TabButton
              label="Notes"
              isActive={activeTab === 'notes'}
              onClick={() =>
                setActiveTab(activeTab === 'notes' ? null : 'notes')
              }
            />
          )}
          {meds.length > 0 && (
            <TabButton
              label={`Meds (${meds.length})`}
              isActive={activeTab === 'meds'}
              onClick={() => setActiveTab(activeTab === 'meds' ? null : 'meds')}
            />
          )}
          {(labs.length > 0 || imaging.length > 0 || procedures.length > 0) && (
            <TabButton
              label={`Tests (${labs.length + imaging.length + procedures.length})`}
              isActive={activeTab === 'tests'}
              onClick={() =>
                setActiveTab(activeTab === 'tests' ? null : 'tests')
              }
            />
          )}
          {hasPlan && (
            <TabButton
              label="Plan"
              isActive={activeTab === 'plan'}
              onClick={() => setActiveTab(activeTab === 'plan' ? null : 'plan')}
            />
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab && (
        <div className="px-5 py-4 bg-white">
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {encounter.consultation?.history_of_present_illness && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    History
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {encounter.consultation.history_of_present_illness}
                  </p>
                </div>
              )}
              {encounter.consultation?.examination_findings && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    Examination
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {encounter.consultation.examination_findings}
                  </p>
                </div>
              )}
              {encounter.consultation?.diagnosis && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    Assessment
                  </p>
                  <p className="text-sm text-gray-900 font-medium">
                    {encounter.consultation.diagnosis}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'meds' && (
            <div className="space-y-2">
              {meds.map((med: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-baseline justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {med.drug_name}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      {med.dosage}
                    </span>
                    {med.frequency && (
                      <span className="text-sm text-gray-400 ml-1">
                        • {med.frequency}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs ${med.status === 'Dispensed' ? 'text-green-600' : 'text-gray-400'}`}
                  >
                    {med.status || 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="space-y-3">
              {labs.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-cyan-700 uppercase tracking-wide mb-2">
                    Laboratory Tests
                  </p>
                  <div className="space-y-1">
                    {labs.map((lab: any, idx: number) => (
                      <div
                        key={idx}
                        className="py-2 px-3 rounded-lg border border-cyan-200 bg-cyan-50/70 mb-2 last:mb-0"
                      >
                        <div className="flex items-center justify-between text-sm gap-2">
                          <span className="text-gray-700 font-medium">
                            {lab.test_name || lab.test?.test_name || 'Test'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-600 text-white tracking-wide">
                              Test
                            </span>
                            <span
                              className={`text-xs ${
                                lab.status === 'Completed' ||
                                lab.status === 'Result_Ready'
                                  ? 'text-green-600'
                                  : 'text-gray-400'
                              }`}
                            >
                              {lab.status?.replace(/_/g, ' ') || 'Pending'}
                            </span>
                          </div>
                        </div>
                        {(lab.result ||
                          lab.result_value ||
                          lab.interpretation ||
                          lab.result_notes ||
                          lab.clinical_notes) && (
                          <p className="text-xs text-gray-500 mt-1">
                            {lab.result
                              ? `Result: ${lab.result}`
                              : lab.result_value
                                ? `Value: ${`${lab.result_value} ${lab.result_unit || ''}`.trim()}`
                                : null}
                            {lab.interpretation
                              ? ` | Interpretation: ${lab.interpretation}`
                              : ''}
                            {lab.result_notes
                              ? ` | Notes: ${lab.result_notes}`
                              : ''}
                            {lab.clinical_notes
                              ? ` | Clinical Notes: ${lab.clinical_notes}`
                              : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {imaging.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2">
                    Imaging Tests
                  </p>
                  <div className="space-y-1">
                    {imaging.map((study: any, idx: number) => (
                      <div
                        key={idx}
                        className="py-2 px-3 rounded-lg border border-purple-200 bg-purple-50/70 mb-2 last:mb-0"
                      >
                        <div className="flex items-center justify-between text-sm gap-2">
                          <span className="text-gray-700 font-medium">
                            {study.exam_name ||
                              study.study_type ||
                              study.modality ||
                              study.imaging_type}
                            {study.body_part && ` - ${study.body_part}`}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-600 text-white tracking-wide">
                              Test
                            </span>
                            <span
                              className={`text-xs ${
                                study.status === 'Completed' ||
                                study.status === 'Reported'
                                  ? 'text-green-600'
                                  : 'text-gray-400'
                              }`}
                            >
                              {study.status?.replace(/_/g, ' ') || 'Pending'}
                            </span>
                          </div>
                        </div>
                        {(study.findings ||
                          study.impression ||
                          study.report?.findings ||
                          study.report?.impression ||
                          study.clinical_indication ||
                          study.report) && (
                          <p className="text-xs text-gray-500 mt-1">
                            {study.clinical_indication
                              ? `Indication: ${study.clinical_indication}`
                              : ''}
                            {study.findings || study.report?.findings
                              ? `Findings: ${study.findings || study.report?.findings}`
                              : ''}
                            {study.impression || study.report?.impression
                              ? ` | Impression: ${study.impression || study.report?.impression}`
                              : ''}
                            {typeof study.report === 'string' &&
                            study.report.trim()
                              ? ` | Report: ${study.report}`
                              : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {procedures.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
                    Procedure Results
                  </p>
                  <div className="space-y-1">
                    {procedures.map((proc: any, idx: number) => (
                      <div
                        key={idx}
                        className="py-2 px-3 rounded-lg border border-amber-200 bg-amber-50/70 mb-2 last:mb-0"
                      >
                        <div className="flex items-center justify-between text-sm gap-2">
                          <span className="text-gray-700 font-medium">
                            {proc.procedure_name ||
                              proc.procedure_number ||
                              'Procedure'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-600 text-white tracking-wide">
                              Result
                            </span>
                            <span
                              className={`text-xs ${
                                proc.status === 'completed' ||
                                proc.status === 'Completed'
                                  ? 'text-green-600'
                                  : 'text-gray-400'
                              }`}
                            >
                              {proc.status?.replace(/_/g, ' ') || 'Pending'}
                            </span>
                          </div>
                        </div>
                        {(proc.findings ||
                          proc.post_procedure_diagnosis ||
                          proc.procedure_notes ||
                          proc.complications ||
                          proc.technique_description ||
                          proc.indication) && (
                          <p className="text-xs text-gray-500 mt-1">
                            {proc.indication
                              ? `Indication: ${proc.indication}`
                              : ''}
                            {proc.findings ? `Findings: ${proc.findings}` : ''}
                            {proc.post_procedure_diagnosis
                              ? ` | Post-op Dx: ${proc.post_procedure_diagnosis}`
                              : ''}
                            {proc.procedure_notes
                              ? ` | Notes: ${proc.procedure_notes}`
                              : ''}
                            {proc.technique_description
                              ? ` | Technique: ${proc.technique_description}`
                              : ''}
                            {proc.complications
                              ? ` | Complications: ${proc.complications}`
                              : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'plan' && (
            <div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {encounter.consultation?.treatment_plan}
              </p>
              {encounter.consultation?.follow_up_date && (
                <p className="text-sm text-primary-700 mt-3">
                  Follow-up: {formatDate(encounter.consultation.follow_up_date)}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Default hint when no tab selected */}
      {!activeTab && (
        <div className="px-5 py-4 bg-white text-center">
          <p className="text-sm text-gray-400">
            Select a section above to view details
          </p>
        </div>
      )}

      {/* View Full Details */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
        <button
          onClick={onViewDetails}
          className="text-sm text-primary-700 hover:text-[#005028] font-medium"
        >
          Open full encounter →
        </button>
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
        isActive
          ? 'bg-primary-700 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

// =============================================================================
// Load More & Empty States
// =============================================================================

function LoadMore({
  isLoading,
  hasMore,
  onLoadMore,
}: {
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  if (!hasMore && !isLoading) {
    return (
      <p className="text-center text-sm text-gray-400 py-8">
        All encounters loaded
      </p>
    );
  }

  return (
    <div ref={ref} className="py-8 text-center">
      {isLoading ? (
        <Loader size={20} className="animate-spin text-gray-400 mx-auto" />
      ) : (
        <button
          onClick={onLoadMore}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Load more
        </button>
      )}
    </div>
  );
}

function EmptyState({ hasProblem }: { hasProblem: boolean }) {
  return (
    <div className="text-center py-16">
      <p className="text-gray-500">
        {hasProblem ? 'No encounters for this problem' : 'No encounters found'}
      </p>
    </div>
  );
}

// =============================================================================
// Main Component - Clean Encounter Timeline
// =============================================================================

export function MainRecordsPanel({
  encounters,
  selectedProblem,
  isLoading,
  hasMore,
  onLoadMore,
  onEncounterClick,
}: MainRecordsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Auto-expand first encounter
  useEffect(() => {
    if (encounters.length > 0 && !expandedId) {
      setExpandedId(encounters[0].encounter_id);
    }
  }, [encounters, expandedId]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Section Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedProblem ? 'Related Encounters' : 'Encounter History'}
          </h2>
          {selectedProblem && (
            <p className="text-sm text-gray-500 mt-1">
              Showing visits related to:{' '}
              <span className="font-medium">{selectedProblem.name}</span>
            </p>
          )}
          <p className="text-sm text-gray-400 mt-1">
            {encounters.length} {encounters.length === 1 ? 'visit' : 'visits'}
          </p>
        </div>

        {/* Encounter List */}
        {isLoading && encounters.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader size={24} className="animate-spin text-gray-400" />
          </div>
        ) : encounters.length === 0 ? (
          <EmptyState hasProblem={!!selectedProblem} />
        ) : (
          <>
            {encounters.map((encounter) => (
              <EncounterCard
                key={encounter.encounter_id}
                encounter={encounter}
                isExpanded={expandedId === encounter.encounter_id}
                onToggle={() => toggleExpand(encounter.encounter_id)}
                onViewDetails={() => onEncounterClick(encounter.encounter_id)}
              />
            ))}

            <LoadMore
              isLoading={isLoading}
              hasMore={hasMore}
              onLoadMore={onLoadMore}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default MainRecordsPanel;
