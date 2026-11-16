/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - CLINICAL PATIENT OVERVIEW PANEL
 * Professional clinical sidebar with patient summary, vitals, problems, and medications
 * Designed for rapid clinical assessment and decision support
 * =============================================================================
 */

import React, { useState } from 'react';
import {
  Activity,
  Pill,
  Calendar,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  CircleDot,
  Eye,
  ChevronDown,
  ChevronRight,
  Heart,
  Stethoscope,
  Thermometer,
  Wind,
  Droplets,
  Scale,
  User,
  Download,
  FileText,
  Filter,
} from 'lucide-react';
import {
  PatientProblem,
  MedicationSummary,
  VitalSnapshot,
  RecordStats,
  ProblemStatus,
  ProblemSeverity,
} from '../../api/medical-records.api';

// =============================================================================
// Types
// =============================================================================

export type TimeFilterValue = '3m' | '6m' | '1y' | 'all';
export type TimeframeFilter = TimeFilterValue;

export interface PatientStoryPanelProps {
  problems: PatientProblem[];
  currentMedications: MedicationSummary[];
  latestVitals?: VitalSnapshot;
  stats?: RecordStats;
  selectedProblem: PatientProblem | null;
  selectedTimeFilter: TimeFilterValue;
  onProblemSelect: (problem: PatientProblem | null) => void;
  onTimeFilterChange: (timeFilter: TimeFilterValue) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onExportClick?: () => void;
  showExportSection?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

function getStatusConfig(status: ProblemStatus) {
  switch (status) {
    case 'Active':
      return {
        bg: 'bg-red-500',
        text: 'text-red-700',
        light: 'bg-red-50',
        border: 'border-red-200',
        icon: AlertCircle,
      };
    case 'Chronic':
      return {
        bg: 'bg-amber-500',
        text: 'text-amber-700',
        light: 'bg-amber-50',
        border: 'border-amber-200',
        icon: Activity,
      };
    case 'Monitoring':
      return {
        bg: 'bg-blue-500',
        text: 'text-blue-700',
        light: 'bg-blue-50',
        border: 'border-blue-200',
        icon: Eye,
      };
    case 'Resolved':
      return {
        bg: 'bg-green-500',
        text: 'text-green-700',
        light: 'bg-green-50',
        border: 'border-green-200',
        icon: CheckCircle,
      };
    default:
      return {
        bg: 'bg-gray-400',
        text: 'text-gray-600',
        light: 'bg-gray-50',
        border: 'border-gray-200',
        icon: CircleDot,
      };
  }
}

function getSeverityConfig(severity: ProblemSeverity) {
  switch (severity) {
    case 'Critical':
      return {
        indicator: 'bg-red-600',
        text: 'text-red-600',
        label: 'CRITICAL',
      };
    case 'High':
      return {
        indicator: 'bg-orange-500',
        text: 'text-orange-600',
        label: 'HIGH',
      };
    case 'Medium':
      return {
        indicator: 'bg-yellow-500',
        text: 'text-yellow-600',
        label: 'MODERATE',
      };
    case 'Low':
      return {
        indicator: 'bg-green-500',
        text: 'text-green-600',
        label: 'LOW',
      };
    default:
      return { indicator: 'bg-gray-400', text: 'text-gray-500', label: '-' };
  }
}

function getVitalStatus(
  value: number,
  type: 'bp_systolic' | 'bp_diastolic' | 'hr' | 'temp' | 'rr' | 'spo2',
): 'normal' | 'warning' | 'critical' {
  switch (type) {
    case 'bp_systolic':
      if (value >= 180 || value < 90) return 'critical';
      if (value >= 140 || value < 100) return 'warning';
      return 'normal';
    case 'bp_diastolic':
      if (value >= 120 || value < 60) return 'critical';
      if (value >= 90 || value < 65) return 'warning';
      return 'normal';
    case 'hr':
      if (value > 120 || value < 50) return 'critical';
      if (value > 100 || value < 60) return 'warning';
      return 'normal';
    case 'temp':
      if (value >= 39.5 || value < 35) return 'critical';
      if (value >= 38 || value < 36) return 'warning';
      return 'normal';
    case 'rr':
      if (value > 25 || value < 10) return 'critical';
      if (value > 20 || value < 12) return 'warning';
      return 'normal';
    case 'spo2':
      if (value < 90) return 'critical';
      if (value < 94) return 'warning';
      return 'normal';
    default:
      return 'normal';
  }
}

function getVitalStatusColor(
  status: 'normal' | 'warning' | 'critical',
): string {
  switch (status) {
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'warning':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200';
  }
}

// =============================================================================
// Sub-Components
// =============================================================================

function TimeRangeSelector({
  selected,
  onChange,
}: {
  selected: TimeframeFilter;
  onChange: (value: TimeframeFilter) => void;
}) {
  const options: { value: TimeframeFilter; label: string }[] = [
    { value: '3m', label: '3M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'All' },
  ];

  return (
    <div className="inline-flex rounded-md shadow-sm bg-white border border-gray-200">
      {options.map((opt, idx) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`
            px-3 py-1.5 text-xs font-semibold transition-all
            ${idx === 0 ? 'rounded-l-md' : ''} 
            ${idx === options.length - 1 ? 'rounded-r-md' : ''}
            ${idx !== 0 ? 'border-l border-gray-200' : ''}
            ${
              selected === opt.value
                ? 'bg-primary-700 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ClinicalVitalsCard({ vitals }: { vitals: VitalSnapshot }) {
  const bpSystolicStatus = vitals.blood_pressure
    ? getVitalStatus(vitals.blood_pressure.systolic, 'bp_systolic')
    : 'normal';
  const bpDiastolicStatus = vitals.blood_pressure
    ? getVitalStatus(vitals.blood_pressure.diastolic, 'bp_diastolic')
    : 'normal';
  const bpStatus =
    bpSystolicStatus === 'critical' || bpDiastolicStatus === 'critical'
      ? 'critical'
      : bpSystolicStatus === 'warning' || bpDiastolicStatus === 'warning'
        ? 'warning'
        : 'normal';

  const hrStatus = vitals.pulse_rate
    ? getVitalStatus(vitals.pulse_rate, 'hr')
    : 'normal';
  const tempStatus = vitals.temperature
    ? getVitalStatus(vitals.temperature, 'temp')
    : 'normal';
  const rrStatus = vitals.respiratory_rate
    ? getVitalStatus(vitals.respiratory_rate, 'rr')
    : 'normal';
  const spo2Status = vitals.oxygen_saturation
    ? getVitalStatus(vitals.oxygen_saturation, 'spo2')
    : 'normal';

  const hasAnyAbnormal = [
    bpStatus,
    hrStatus,
    tempStatus,
    rrStatus,
    spo2Status,
  ].some((s) => s !== 'normal');

  return (
    <div
      className={`rounded-lg border ${hasAnyAbnormal ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200 bg-white'}`}
    >
      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-primary-700" />
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Latest Vitals
          </span>
        </div>
        {vitals.recorded_at && (
          <span className="text-xs text-gray-400">
            {formatShortDate(vitals.recorded_at)}
          </span>
        )}
      </div>

      <div className="p-3 grid grid-cols-2 gap-2">
        {/* Blood Pressure */}
        {vitals.blood_pressure && (
          <div
            className={`p-2 rounded border ${getVitalStatusColor(bpStatus)}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Heart size={12} />
              <span className="text-xs font-medium uppercase">BP</span>
            </div>
            <div className="text-lg font-bold">
              {vitals.blood_pressure.systolic}/{vitals.blood_pressure.diastolic}
            </div>
            <div className="text-xs opacity-60">mmHg</div>
          </div>
        )}

        {/* Heart Rate */}
        {vitals.pulse_rate && (
          <div
            className={`p-2 rounded border ${getVitalStatusColor(hrStatus)}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Activity size={12} />
              <span className="text-xs font-medium uppercase">HR</span>
            </div>
            <div className="text-lg font-bold">{vitals.pulse_rate}</div>
            <div className="text-xs opacity-60">bpm</div>
          </div>
        )}

        {/* Temperature */}
        {vitals.temperature && (
          <div
            className={`p-2 rounded border ${getVitalStatusColor(tempStatus)}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Thermometer size={12} />
              <span className="text-xs font-medium uppercase">Temp</span>
            </div>
            <div className="text-lg font-bold">{vitals.temperature}</div>
            <div className="text-xs opacity-60">°C</div>
          </div>
        )}

        {/* SpO2 */}
        {vitals.oxygen_saturation && (
          <div
            className={`p-2 rounded border ${getVitalStatusColor(spo2Status)}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Droplets size={12} />
              <span className="text-xs font-medium uppercase">SpO₂</span>
            </div>
            <div className="text-lg font-bold">{vitals.oxygen_saturation}</div>
            <div className="text-xs opacity-60">%</div>
          </div>
        )}

        {/* Respiratory Rate */}
        {vitals.respiratory_rate && (
          <div
            className={`p-2 rounded border ${getVitalStatusColor(rrStatus)}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Wind size={12} />
              <span className="text-xs font-medium uppercase">RR</span>
            </div>
            <div className="text-lg font-bold">{vitals.respiratory_rate}</div>
            <div className="text-xs opacity-60">/min</div>
          </div>
        )}

        {/* Weight */}
        {vitals.weight && (
          <div className="p-2 rounded border border-gray-200 bg-gray-50 text-gray-700">
            <div className="flex items-center gap-1.5 mb-1">
              <Scale size={12} />
              <span className="text-xs font-medium uppercase">Weight</span>
            </div>
            <div className="text-lg font-bold">{vitals.weight}</div>
            <div className="text-xs opacity-60">kg</div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickStatsBar({ stats }: { stats: RecordStats }) {
  return (
    <div className="grid grid-cols-4 gap-1 bg-gray-100 rounded-lg p-1">
      <div className="text-center py-2 bg-white rounded-md">
        <div className="text-lg font-bold text-primary-700">
          {stats.total_encounters}
        </div>
        <div className="text-xs text-gray-500 uppercase">Visits</div>
      </div>
      <div className="text-center py-2 bg-white rounded-md">
        <div className="text-lg font-bold text-red-600">
          {stats.active_problems}
        </div>
        <div className="text-xs text-gray-500 uppercase">Active</div>
      </div>
      <div className="text-center py-2 bg-white rounded-md">
        <div className="text-lg font-bold text-blue-600">
          {stats.total_lab_tests}
        </div>
        <div className="text-xs text-gray-500 uppercase">Labs</div>
      </div>
      <div className="text-center py-2 bg-white rounded-md">
        <div className="text-lg font-bold text-purple-600">
          {stats.total_prescriptions}
        </div>
        <div className="text-xs text-gray-500 uppercase">Rx</div>
      </div>
    </div>
  );
}

function ActiveMedicationsList({
  medications,
}: {
  medications: MedicationSummary[];
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const activeMeds = medications.filter(
    (m) => m.status !== 'Cancelled' && m.status !== 'Dispensed',
  );
  const displayMeds = isExpanded
    ? activeMeds.slice(0, 5)
    : activeMeds.slice(0, 2);

  if (activeMeds.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400">
        <Pill size={20} className="mx-auto mb-1 opacity-50" />
        <p className="text-xs">No active medications</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {displayMeds.map((med) => (
        <div
          key={med.prescription_id}
          className="flex items-start gap-2 p-2 bg-white rounded border border-gray-100 hover:border-blue-200 transition-colors"
        >
          <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Pill size={10} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {med.drug_name}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {med.dosage} • {med.frequency}
            </div>
          </div>
          <div
            className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              med.status === 'Pending'
                ? 'bg-amber-100 text-amber-700'
                : med.status === 'Partial'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
            }`}
          >
            {med.status}
          </div>
        </div>
      ))}

      {activeMeds.length > 2 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-xs text-primary-700 hover:text-primary-600 py-1.5 flex items-center justify-center gap-1 bg-gray-50 rounded"
        >
          {isExpanded ? <>Show less</> : <>Show {activeMeds.length - 2} more</>}
          <ChevronDown
            size={12}
            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </div>
  );
}

function ProblemListClinical({
  problems,
  selectedId,
  onSelect,
}: {
  problems: PatientProblem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [showResolved, setShowResolved] = useState(false);

  // Group problems
  const activeProblems = problems.filter((p) => p.status === 'Active');
  const chronicProblems = problems.filter((p) => p.status === 'Chronic');
  const monitoringProblems = problems.filter((p) => p.status === 'Monitoring');
  const resolvedProblems = problems.filter((p) => p.status === 'Resolved');

  const renderProblemItem = (problem: PatientProblem) => {
    const statusConfig = getStatusConfig(problem.status);
    const severityConfig = getSeverityConfig(problem.severity);
    const StatusIcon = statusConfig.icon;
    const isSelected = selectedId === problem.id;

    return (
      <button
        key={problem.id}
        onClick={() => onSelect(isSelected ? null : problem.id)}
        className={`
          w-full text-left p-2.5 rounded-lg border transition-all
          ${
            isSelected
              ? 'border-primary-700 bg-primary-700/5 ring-1 ring-primary-700/20'
              : 'border-gray-100 hover:border-gray-200 bg-white hover:shadow-sm'
          }
        `}
      >
        <div className="flex items-start gap-2">
          {/* Status Icon */}
          <div
            className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${statusConfig.light}`}
          >
            <StatusIcon size={12} className={statusConfig.text} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 truncate">
                {problem.name}
              </span>
              {problem.severity !== 'Low' && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${severityConfig.indicator}`}
                  title={severityConfig.label}
                />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
              <span>
                {problem.related_encounter_count} visit
                {problem.related_encounter_count !== 1 ? 's' : ''}
              </span>
              <span className="text-gray-300">•</span>
              <span>{formatShortDate(problem.last_reviewed)}</span>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`px-1.5 py-0.5 rounded text-xs font-semibold uppercase ${statusConfig.light} ${statusConfig.text}`}
          >
            {problem.status}
          </span>
        </div>
      </button>
    );
  };

  const renderSection = (
    title: string,
    items: PatientProblem[],
    icon: React.ReactNode,
    color: string,
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-1.5">
        <div
          className={`flex items-center gap-1.5 text-xs font-semibold uppercase ${color}`}
        >
          {icon}
          {title} ({items.length})
        </div>
        <div className="space-y-1">{items.map(renderProblemItem)}</div>
      </div>
    );
  };

  const hasActiveIssues =
    activeProblems.length > 0 || chronicProblems.length > 0;

  return (
    <div className="space-y-4">
      {/* Active/Chronic Problems - Always Show */}
      {!hasActiveIssues && resolvedProblems.length === 0 && (
        <div className="text-center py-6 text-gray-400">
          <Stethoscope size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No problems on record</p>
        </div>
      )}

      {renderSection(
        'Active',
        activeProblems,
        <AlertCircle size={12} />,
        'text-red-600',
      )}
      {renderSection(
        'Chronic',
        chronicProblems,
        <Activity size={12} />,
        'text-amber-600',
      )}
      {renderSection(
        'Monitoring',
        monitoringProblems,
        <Eye size={12} />,
        'text-blue-600',
      )}

      {/* Resolved - Collapsible */}
      {resolvedProblems.length > 0 && (
        <div>
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase text-green-600 w-full"
          >
            <ChevronRight
              size={12}
              className={`transition-transform ${showResolved ? 'rotate-90' : ''}`}
            />
            <CheckCircle size={12} />
            Resolved ({resolvedProblems.length})
          </button>
          {showResolved && (
            <div className="mt-1.5 space-y-1">
              {resolvedProblems.map(renderProblemItem)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Compact Vitals Display - Inline
// =============================================================================

function CompactVitalsDisplay({ vitals }: { vitals: VitalSnapshot }) {
  const bpSystolicStatus = vitals.blood_pressure
    ? getVitalStatus(vitals.blood_pressure.systolic, 'bp_systolic')
    : 'normal';
  const bpDiastolicStatus = vitals.blood_pressure
    ? getVitalStatus(vitals.blood_pressure.diastolic, 'bp_diastolic')
    : 'normal';
  const bpStatus =
    bpSystolicStatus === 'critical' || bpDiastolicStatus === 'critical'
      ? 'critical'
      : bpSystolicStatus === 'warning' || bpDiastolicStatus === 'warning'
        ? 'warning'
        : 'normal';
  const hrStatus = vitals.pulse_rate
    ? getVitalStatus(vitals.pulse_rate, 'hr')
    : 'normal';
  const tempStatus = vitals.temperature
    ? getVitalStatus(vitals.temperature, 'temp')
    : 'normal';

  const getStatusDot = (status: VitalStatusType) => {
    if (status === 'critical') return 'bg-red-500';
    if (status === 'warning') return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {vitals.blood_pressure && (
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${getStatusDot(bpStatus)}`}
          />
          <Heart size={12} className="text-gray-400" />
          <span className="font-semibold text-gray-900">
            {vitals.blood_pressure.systolic}/{vitals.blood_pressure.diastolic}
          </span>
        </div>
      )}
      {vitals.pulse_rate && (
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${getStatusDot(hrStatus)}`}
          />
          <Activity size={12} className="text-gray-400" />
          <span className="font-semibold text-gray-900">
            {vitals.pulse_rate}
          </span>
          <span className="text-gray-400 text-xs">bpm</span>
        </div>
      )}
      {vitals.temperature && (
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${getStatusDot(tempStatus)}`}
          />
          <Thermometer size={12} className="text-gray-400" />
          <span className="font-semibold text-gray-900">
            {vitals.temperature}°C
          </span>
        </div>
      )}
      {vitals.oxygen_saturation && (
        <div className="flex items-center gap-1.5">
          <Droplets size={12} className="text-gray-400" />
          <span className="font-semibold text-gray-900">
            {vitals.oxygen_saturation}%
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Compact Medications List
// =============================================================================

function CompactMedicationsList({
  medications,
}: {
  medications: MedicationSummary[];
}) {
  const activeMeds = medications.filter(
    (m) => m.status !== 'Cancelled' && m.status !== 'Dispensed',
  );

  if (activeMeds.length === 0) {
    return (
      <span className="text-gray-400 text-sm italic">
        No active medications
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {activeMeds.slice(0, 4).map((med) => (
        <span
          key={med.prescription_id}
          className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full truncate max-w-32"
          title={`${med.drug_name} - ${med.dosage}`}
        >
          {med.drug_name}
        </span>
      ))}
      {activeMeds.length > 4 && (
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
          +{activeMeds.length - 4}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Compact Problem List
// =============================================================================

function CompactProblemList({
  problems,
  selectedId,
  onSelect,
}: {
  problems: PatientProblem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const activeProblems = problems.filter(
    (p) => p.status === 'Active' || p.status === 'Chronic',
  );
  const resolvedCount = problems.filter((p) => p.status === 'Resolved').length;

  if (problems.length === 0) {
    return (
      <span className="text-gray-400 text-sm italic">
        No problems on record
      </span>
    );
  }

  return (
    <div className="space-y-1">
      {activeProblems.slice(0, 5).map((problem) => {
        const isSelected = selectedId === problem.id;
        return (
          <button
            key={problem.id}
            onClick={() => onSelect(isSelected ? null : problem.id)}
            className={`
              w-full text-left px-2 py-1.5 rounded transition-all text-sm flex items-center gap-2
              ${
                isSelected
                  ? 'bg-primary-700/10 text-primary-700 ring-1 ring-primary-700/30'
                  : 'hover:bg-gray-100 text-gray-700'
              }
            `}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                problem.status === 'Active' ? 'bg-red-500' : 'bg-amber-500'
              }`}
            />
            <span className="truncate flex-1">{problem.name}</span>
            <span className="text-xs text-gray-400">
              {problem.related_encounter_count}
            </span>
          </button>
        );
      })}
      {activeProblems.length > 5 && (
        <div className="text-xs text-gray-500 pl-2">
          +{activeProblems.length - 5} more active
        </div>
      )}
      {resolvedCount > 0 && (
        <div className="text-xs text-green-600 pl-2 flex items-center gap-1">
          <CheckCircle size={10} />
          {resolvedCount} resolved
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component - Redesigned for Clarity
// =============================================================================

export function PatientStoryPanel({
  problems,
  currentMedications,
  latestVitals,
  stats: propStats,
  selectedProblem,
  selectedTimeFilter,
  onProblemSelect,
  onTimeFilterChange,
  isCollapsed = false,
  onToggleCollapse,
  onExportClick,
  showExportSection = true,
}: PatientStoryPanelProps) {
  const stats: RecordStats = propStats || {
    total_encounters: 0,
    total_problems: problems.length,
    active_problems: problems.filter(
      (p) => p.status === 'Active' || p.status === 'Chronic',
    ).length,
    total_lab_tests: 0,
    total_imaging: 0,
    total_prescriptions: currentMedications.length,
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-3">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
          title="Expand sidebar"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white h-full flex flex-col">
      {/* Header with Time Filter */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          Clinical Overview
        </h2>
        <TimeRangeSelector
          selected={selectedTimeFilter}
          onChange={onTimeFilterChange}
        />
      </div>

      {/* Export Records Section */}
      {showExportSection && onExportClick && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-primary-700" />
              <span className="text-xs font-semibold text-gray-700">
                Export Records
              </span>
            </div>
            <button
              onClick={onExportClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 text-white text-xs font-medium rounded-lg hover:bg-primary-800 transition-colors shadow-sm"
            >
              <Download size={12} />
              <span>Export PDF</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Generate comprehensive reports with customizable filters by date,
            category, and modules.
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {['Labs', 'Radiology', 'Vitals', 'Billing', 'Diagnoses'].map(
              (module) => (
                <span
                  key={module}
                  className="px-1.5 py-0.5 bg-white/60 border border-green-200 rounded text-[9px] text-gray-600"
                >
                  {module}
                </span>
              ),
            )}
            <span className="px-1.5 py-0.5 bg-primary-700/10 border border-primary-700/20 rounded text-[9px] text-primary-700 font-medium">
              +7 more
            </span>
          </div>
        </div>
      )}

      {/* Scrollable Content - Single smooth scroll */}
      <div className="flex-1 overflow-y-auto">
        {/* Quick Stats Row */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-primary-700">
                {stats.total_encounters}
              </div>
              <div className="text-xs text-gray-500 uppercase">Visits</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">
                {stats.active_problems}
              </div>
              <div className="text-xs text-gray-500 uppercase">Active</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">
                {stats.total_lab_tests}
              </div>
              <div className="text-xs text-gray-500 uppercase">Labs</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">
                {stats.total_prescriptions}
              </div>
              <div className="text-xs text-gray-500 uppercase">Rx</div>
            </div>
          </div>
        </div>

        {/* Latest Vitals - Compact */}
        {latestVitals && (
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} className="text-primary-700" />
              <span className="text-xs font-semibold text-gray-600 uppercase">
                Latest Vitals
              </span>
              {latestVitals.recorded_at && (
                <span className="text-xs text-gray-400 ml-auto">
                  {formatShortDate(latestVitals.recorded_at)}
                </span>
              )}
            </div>
            <CompactVitalsDisplay vitals={latestVitals} />
          </div>
        )}

        {/* Current Medications - Compact */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Pill size={14} className="text-blue-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase">
              Medications
            </span>
            <span className="text-xs text-gray-400 ml-auto">
              {currentMedications.length}
            </span>
          </div>
          <CompactMedicationsList medications={currentMedications} />
        </div>

        {/* Problem List - Compact & Clickable */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope size={14} className="text-primary-700" />
            <span className="text-xs font-semibold text-gray-600 uppercase">
              Problems
            </span>
            <span className="text-xs text-gray-400 ml-auto">
              {problems.length} total
            </span>
          </div>
          <CompactProblemList
            problems={problems}
            selectedId={selectedProblem?.id || null}
            onSelect={(problemId) => {
              if (problemId === null) {
                onProblemSelect(null);
              } else {
                const problem = problems.find((p) => p.id === problemId);
                onProblemSelect(problem || null);
              }
            }}
          />
        </div>
      </div>

      {/* Footer - Last Visit */}
      {stats.last_visit_date && (
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-2">
          <Calendar size={12} />
          <span>Last visit: {formatDate(stats.last_visit_date)}</span>
        </div>
      )}
    </div>
  );
}

export default PatientStoryPanel;
