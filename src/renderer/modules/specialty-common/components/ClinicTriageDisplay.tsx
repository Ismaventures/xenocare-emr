/**
 * =============================================================================
 * CLINIC TRIAGE DISPLAY
 * =============================================================================
 * Read-only display of pre-consultation triage observations.
 * Shown inside the doctor's consultation wizard so they can see nurse recordings
 * before examining the patient.
 *
 * Features:
 * - Color-coded normal/abnormal values
 * - Compact summary or expanded detail view
 * - Timestamp and performer info
 * =============================================================================
 */

import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
} from 'lucide-react';
import { useTriageObservationsByClinic } from '../hooks/useSpecialtyClinic';
import type { ClinicTriageObservation } from '../dtos/specialty-clinic.dto';

interface ClinicTriageDisplayProps {
  encounterId: string;
  clinicType: string;
  compact?: boolean;
}

export default function ClinicTriageDisplay({
  encounterId,
  clinicType,
  compact = false,
}: ClinicTriageDisplayProps) {
  const { data: observations, isLoading } = useTriageObservationsByClinic(
    encounterId,
    clinicType,
  );
  const [expanded, setExpanded] = useState(!compact);

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg p-3">
        <div className="h-4 bg-gray-200 rounded w-32" />
      </div>
    );
  }

  if (!observations || observations.length === 0) {
    return null; // Don't show anything if no triage was done
  }

  const abnormalCount = observations.filter((o) => o.is_abnormal).length;

  // Format time
  const triageTime = observations[0]?.performed_at
    ? new Date(observations[0].performed_at).toLocaleTimeString('en-NG', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  // Compact summary line
  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200
          rounded-lg hover:bg-blue-100 transition-colors text-left"
      >
        <Activity className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <span className="text-sm text-blue-700 font-medium">
          Triage Recorded
        </span>
        <span className="text-xs text-gray-600">
          {observations.length} observations
        </span>
        {abnormalCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
            <AlertTriangle className="w-3 h-3" />
            {abnormalCount} abnormal
          </span>
        )}
        <span className="text-xs text-gray-500 ml-auto">{triageTime}</span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-100/80 cursor-pointer"
        onClick={() => compact && setExpanded(false)}
      >
        <Activity className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-semibold text-blue-800">
          Pre-Consultation Triage
        </span>
        {abnormalCount > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full border border-red-200">
            <AlertTriangle className="w-3 h-3" />
            {abnormalCount} abnormal
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-600">
          <Clock className="w-3 h-3" />
          {triageTime}
          {compact && <ChevronUp className="w-4 h-4" />}
        </div>
      </div>

      {/* Observation Grid */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {observations.map((obs) => (
            <TriageObservationCard key={obs.id} observation={obs} />
          ))}
        </div>

        {/* Notes */}
        {observations.some((o) => o.notes) && (
          <div className="mt-2.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
            <span className="text-gray-500 font-medium">Note: </span>
            {observations.find((o) => o.notes)?.notes}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Helper: Single observation card
// =============================================================================

function TriageObservationCard({
  observation,
}: {
  observation: ClinicTriageObservation;
}) {
  const {
    observation_type,
    observation_value,
    observation_unit,
    is_abnormal,
    normal_range,
  } = observation;

  // Convert test_code back to readable label
  const label = observation_type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      className={`flex flex-col px-3 py-2.5 rounded-lg border ${
        is_abnormal ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'
      }`}
    >
      <span className="text-xs text-gray-500 font-medium truncate">
        {label}
      </span>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span
          className={`text-lg font-bold ${
            is_abnormal ? 'text-red-700' : 'text-gray-900'
          }`}
        >
          {observation_value}
        </span>
        {observation_unit && (
          <span className="text-xs text-gray-500">{observation_unit}</span>
        )}
        {is_abnormal && (
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 ml-auto flex-shrink-0" />
        )}
        {!is_abnormal && normal_range && (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 ml-auto flex-shrink-0" />
        )}
      </div>
      {normal_range && (
        <span className="text-[11px] text-gray-400 mt-0.5">
          Normal: {normal_range}
        </span>
      )}
    </div>
  );
}
