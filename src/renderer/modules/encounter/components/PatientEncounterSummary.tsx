/**
 * =============================================================================
 * XENOCARE EMR - PATIENT ENCOUNTER SUMMARY COMPONENT
 * Description: Consolidated view of encounters grouped by patient with expand/collapse
 * Shows patient with encounter count, expands to show all encounters on click
 * =============================================================================
 */

import React, { useState, useMemo } from 'react';
import {
  User,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  AlertTriangle,
  Building2,
  Activity,
  Stethoscope,
  FileText,
  BedDouble,
  Hash,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import {
  Encounter,
  getEncounterStatusColor,
  getPriorityColor,
  getVisitTypeColor,
  formatEncounterPatientName,
  formatEncounterDateTime,
  EncounterStatus,
  VisitType,
  PriorityLevel,
} from '../dtos/encounter.dto';

// =============================================================================
// Types
// =============================================================================

interface PatientEncounterGroup {
  patientId: string;
  patientName: string;
  emrNumber: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
  patientCategory?: string;
  insuranceType?: string;
  encounters: Encounter[];
  latestEncounter: Encounter;
  totalEncounters: number;
  activeEncounters: number;
  completedEncounters: number;
}

interface PatientEncounterSummaryProps {
  encounters: Encounter[];
  isLoading?: boolean;
  onEncounterClick?: (encounter: Encounter) => void;
  onPatientClick?: (patientId: string) => void;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Group encounters by patient
 */
function groupEncountersByPatient(
  encounters: Encounter[],
): PatientEncounterGroup[] {
  const patientMap = new Map<string, PatientEncounterGroup>();

  encounters.forEach((encounter) => {
    const patientId =
      encounter.patient_id ||
      (encounter.patient as any)?.id ||
      (encounter.patient as any)?.patient_id ||
      'unknown';
    const { patient } = encounter;

    if (!patientMap.has(patientId)) {
      patientMap.set(patientId, {
        patientId,
        patientName: patient
          ? `${patient.first_name} ${patient.surname || patient.last_name || ''}`.trim()
          : 'Unknown Patient',
        emrNumber: patient?.emr_number || '',
        gender: patient?.gender,
        dateOfBirth: patient?.date_of_birth,
        phone: patient?.contact_phone || patient?.phone,
        patientCategory: (patient as any)?.patient_category,
        insuranceType: (patient as any)?.insurance_type,
        encounters: [],
        latestEncounter: encounter,
        totalEncounters: 0,
        activeEncounters: 0,
        completedEncounters: 0,
      });
    }

    const group = patientMap.get(patientId)!;
    group.encounters.push(encounter);
    group.totalEncounters++;

    // Track status counts
    if (
      encounter.status === 'Active' ||
      encounter.status === 'In Progress' ||
      encounter.status === 'Waiting'
    ) {
      group.activeEncounters++;
    } else if (encounter.status === 'Completed') {
      group.completedEncounters++;
    }

    // Keep track of latest encounter
    if (
      new Date(encounter.created_at) >
      new Date(group.latestEncounter.created_at)
    ) {
      group.latestEncounter = encounter;
    }
  });

  // Sort encounters within each group by date (newest first)
  patientMap.forEach((group) => {
    group.encounters.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  });

  // Convert to array and sort by latest encounter date (newest first)
  return Array.from(patientMap.values()).sort(
    (a, b) =>
      new Date(b.latestEncounter.created_at).getTime() -
      new Date(a.latestEncounter.created_at).getTime(),
  );
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth?: string): string {
  if (!dateOfBirth) return '';
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return `${age}y`;
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Individual Encounter Row within expanded patient group
 */
const EncounterRow: React.FC<{
  encounter: Encounter;
  onClick?: () => void;
}> = ({ encounter, onClick }) => {
  const statusColor = getEncounterStatusColor(
    encounter.status as EncounterStatus,
  );
  const priorityColor = getPriorityColor(
    (encounter.priority as PriorityLevel) || 'Normal',
  );
  const visitTypeColor = getVisitTypeColor(encounter.visit_type as VisitType);

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between py-3 px-4 hover:bg-primary-700/5 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
    >
      <div className="flex items-center gap-4">
        {/* Encounter Number */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <Hash className="h-3.5 w-3.5 text-gray-400" />
          <span className="font-mono text-sm font-medium text-gray-700">
            {encounter.encounter_number ||
              encounter.visit_id?.slice(0, 8) ||
              '-'}
          </span>
        </div>

        {/* Date/Time */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-sm text-gray-600">
            {formatEncounterDateTime(encounter.created_at)}
          </span>
        </div>

        {/* Clinic */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <Building2 className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-sm text-gray-600 truncate">
            {encounter.clinic?.clinic_name || 'GOPD'}
          </span>
        </div>

        {/* Visit Type */}
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded ${visitTypeColor.bg} ${visitTypeColor.text}`}
        >
          {encounter.visit_type?.split(' ')[0] || 'OPD'}
        </span>

        {/* Priority */}
        {encounter.priority && encounter.priority !== 'Normal' && (
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 ${priorityColor.bg} ${priorityColor.text}`}
          >
            <AlertTriangle className="h-3 w-3" />
            {encounter.priority}
          </span>
        )}
      </div>

      {/* Status & Action */}
      <div className="flex items-center gap-3">
        <span
          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusColor.bg} ${statusColor.text}`}
        >
          {encounter.status}
        </span>
        <ExternalLink className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
};

/**
 * Patient Group Card with expandable encounters
 */
const PatientGroupCard: React.FC<{
  group: PatientEncounterGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onEncounterClick?: (encounter: Encounter) => void;
  onPatientClick?: (patientId: string) => void;
}> = ({ group, isExpanded, onToggle, onEncounterClick, onPatientClick }) => {
  const latestStatusColor = getEncounterStatusColor(
    group.latestEncounter.status as EncounterStatus,
  );

  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
        isExpanded
          ? 'border-primary-700/30 shadow-md'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Patient Header - Always Visible */}
      <div
        onClick={onToggle}
        className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
          isExpanded ? 'bg-primary-700/5' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Expand/Collapse Icon */}
          <div
            className={`p-1 rounded-lg transition-colors ${isExpanded ? 'bg-primary-700/10' : 'bg-gray-100'}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-primary-700" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-500" />
            )}
          </div>

          {/* Patient Avatar */}
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-700/10 to-primary-700/5 text-primary-700 font-semibold">
              {group.patientName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            {group.activeEncounters > 0 && (
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
                <Activity className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>

          {/* Patient Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">
                {group.patientName}
              </h3>
              <span className="text-xs font-medium text-primary-700 bg-primary-700/10 px-2 py-0.5 rounded">
                {group.emrNumber || 'N/A'}
              </span>
              {group.gender && (
                <span className="text-xs text-gray-500">{group.gender}</span>
              )}
              {group.dateOfBirth && (
                <span className="text-xs text-gray-400">
                  {calculateAge(group.dateOfBirth)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Last:{' '}
                {formatEncounterDateTime(group.latestEncounter.created_at)}
              </span>
              {group.patientCategory && (
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {group.patientCategory}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Encounter Count Badge */}
        <div className="flex items-center gap-4">
          {/* Status Indicators */}
          <div className="flex items-center gap-2">
            {group.activeEncounters > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                <Activity className="h-3 w-3" />
                {group.activeEncounters} Active
              </span>
            )}
            {group.completedEncounters > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                <CheckCircle className="h-3 w-3" />
                {group.completedEncounters} Done
              </span>
            )}
          </div>

          {/* Total Count */}
          <div className="flex items-center gap-2 px-4 py-2 bg-primary-700/10 rounded-lg">
            <FileText className="h-4 w-4 text-primary-700" />
            <span className="text-lg font-bold text-primary-700">
              {group.totalEncounters}
            </span>
            <span className="text-xs text-primary-700/70">
              encounter{group.totalEncounters !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Encounters List */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50/50">
          {/* Table Header */}
          <div className="flex items-center justify-between py-2 px-4 bg-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="flex items-center gap-4">
              <span className="min-w-[140px]">Encounter #</span>
              <span className="min-w-[120px]">Date</span>
              <span className="min-w-[140px]">Clinic</span>
              <span>Type</span>
            </div>
            <span>Status</span>
          </div>

          {/* Encounter Rows */}
          <div className="max-h-[300px] overflow-y-auto">
            {group.encounters.map((encounter) => (
              <EncounterRow
                key={encounter.id || encounter.visit_id}
                encounter={encounter}
                onClick={() => onEncounterClick?.(encounter)}
              />
            ))}
          </div>

          {/* View Patient Profile Link */}
          {onPatientClick && (
            <div className="p-3 border-t border-gray-200 bg-white">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPatientClick(group.patientId);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary-700 hover:bg-primary-700/5 rounded-lg transition-colors"
              >
                <User className="h-4 w-4" />
                View Patient Profile
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const PatientEncounterSummary: React.FC<
  PatientEncounterSummaryProps
> = ({ encounters, isLoading, onEncounterClick, onPatientClick }) => {
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(
    new Set(),
  );

  // Group encounters by patient
  const patientGroups = useMemo(
    () => groupEncountersByPatient(encounters),
    [encounters],
  );

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    return {
      totalPatients: patientGroups.length,
      totalEncounters: encounters.length,
      patientsWithMultiple: patientGroups.filter((g) => g.totalEncounters > 1)
        .length,
      activePatients: patientGroups.filter((g) => g.activeEncounters > 0)
        .length,
    };
  }, [patientGroups, encounters]);

  const toggleExpanded = (patientId: string) => {
    setExpandedPatients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(patientId)) {
        newSet.delete(patientId);
      } else {
        newSet.add(patientId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedPatients(new Set(patientGroups.map((g) => g.patientId)));
  };

  const collapseAll = () => {
    setExpandedPatients(new Set());
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-80 items-center justify-center bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary-700 animate-spin" />
          <p className="text-sm text-gray-600">Loading encounters...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (patientGroups.length === 0) {
    return (
      <div className="flex h-80 flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100">
        <div className="h-16 w-16 rounded-full bg-primary-700/10 flex items-center justify-center mb-4">
          <User className="h-8 w-8 text-primary-700/40" />
        </div>
        <p className="text-lg font-semibold text-gray-700">
          No encounters found
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Adjust your filters or create new encounters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-6">
          {/* Stats */}
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary-700" />
            <span className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">
                {summaryStats.totalPatients}
              </span>{' '}
              patients
            </span>
          </div>
          <div className="h-4 border-l border-gray-300" />
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">
                {summaryStats.totalEncounters}
              </span>{' '}
              encounters
            </span>
          </div>
          <div className="h-4 border-l border-gray-300" />
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">
                {summaryStats.activePatients}
              </span>{' '}
              with active visits
            </span>
          </div>
          {summaryStats.patientsWithMultiple > 0 && (
            <>
              <div className="h-4 border-l border-gray-300" />
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                <AlertTriangle className="h-4 w-4" />
                {summaryStats.patientsWithMultiple} with multiple encounters
              </div>
            </>
          )}
        </div>

        {/* Expand/Collapse Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Patient Groups List */}
      <div className="space-y-3">
        {patientGroups.map((group) => (
          <PatientGroupCard
            key={group.patientId}
            group={group}
            isExpanded={expandedPatients.has(group.patientId)}
            onToggle={() => toggleExpanded(group.patientId)}
            onEncounterClick={onEncounterClick}
            onPatientClick={onPatientClick}
          />
        ))}
      </div>
    </div>
  );
};

export default PatientEncounterSummary;
