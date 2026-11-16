/**
 * =============================================================================
 * NURSING MODULE - ENCOUNTER SELECTOR COMPONENT
 * =============================================================================
 *
 * Allows nurses to switch between patient encounters while enforcing:
 * - Active encounter defaults to editable mode
 * - Historical encounters are read-only
 * - Clear visual indicators for encounter state
 */

import React from 'react';
import {
  Calendar,
  ChevronDown,
  Activity,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { Select } from '../../../components/ui';
import { EncounterInfo } from '../hooks/useNursingEncounter';

// =============================================================================
// TYPES
// =============================================================================

interface EncounterSelectorProps {
  encounters: EncounterInfo[];
  currentEncounterId: string | null;
  activeEncounterId: string | null;
  onEncounterChange: (encounterId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getStatusColor(status: string): string {
  switch (status) {
    case 'Active':
      return 'text-green-600 bg-green-100';
    case 'Completed':
      return 'text-blue-600 bg-blue-100';
    case 'Closed':
      return 'text-gray-600 bg-gray-100';
    case 'Cancelled':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

function formatEncounterDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function EncounterSelector({
  encounters,
  currentEncounterId,
  activeEncounterId,
  onEncounterChange,
  isLoading = false,
  disabled = false,
}: EncounterSelectorProps) {
  const currentEncounter = encounters.find((e) => e.id === currentEncounterId);
  const isViewingActive = currentEncounterId === activeEncounterId;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg animate-pulse">
        <div className="w-4 h-4 bg-gray-300 rounded" />
        <div className="w-32 h-4 bg-gray-300 rounded" />
      </div>
    );
  }

  if (encounters.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertCircle className="w-4 h-4 text-amber-600" />
        <span className="text-sm text-amber-700">No encounters found</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Encounter Dropdown */}
      <div className="relative">
        <select
          value={currentEncounterId || ''}
          onChange={(e) => onEncounterChange(e.target.value)}
          disabled={disabled}
          className={`
            appearance-none pl-10 pr-8 py-2 text-sm font-medium rounded-lg border
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer'}
            ${isViewingActive ? 'border-green-300' : 'border-amber-300'}
          `}
        >
          {encounters.map((encounter) => (
            <option key={encounter.id} value={encounter.id}>
              {encounter.encounter_number || encounter.visit_id} —{' '}
              {formatEncounterDate(encounter.created_at)} ({encounter.status})
              {encounter.id === activeEncounterId ? ' ✓ Active' : ''}
            </option>
          ))}
        </select>

        {/* Icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Calendar
            className={`w-4 h-4 ${isViewingActive ? 'text-green-600' : 'text-amber-600'}`}
          />
        </div>

        {/* Dropdown Arrow */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Status Badge */}
      {currentEncounter && (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(currentEncounter.status)}`}
        >
          {currentEncounter.status === 'Active' ? (
            <Activity className="w-3 h-3" />
          ) : (
            <Lock className="w-3 h-3" />
          )}
          {currentEncounter.status}
          {!isViewingActive && (
            <span className="ml-1 opacity-75">(Read Only)</span>
          )}
        </div>
      )}

      {/* Quick Switch to Active */}
      {!isViewingActive && activeEncounterId && (
        <button
          onClick={() => onEncounterChange(activeEncounterId)}
          className="text-xs text-green-600 hover:text-green-700 hover:underline"
        >
          Switch to Active
        </button>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT VERSION FOR HEADER
// =============================================================================

export function EncounterSelectorCompact({
  encounters,
  currentEncounterId,
  activeEncounterId,
  onEncounterChange,
}: Omit<EncounterSelectorProps, 'isLoading' | 'disabled'>) {
  const currentEncounter = encounters.find((e) => e.id === currentEncounterId);
  const isViewingActive = currentEncounterId === activeEncounterId;

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentEncounterId || ''}
        onChange={(e) => onEncounterChange(e.target.value)}
        className={`
          text-xs px-2 py-1 rounded border
          ${isViewingActive ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}
        `}
      >
        {encounters.map((encounter) => (
          <option key={encounter.id} value={encounter.id}>
            {encounter.encounter_number || encounter.visit_id}
            {encounter.id === activeEncounterId ? ' ✓' : ''}
          </option>
        ))}
      </select>

      {currentEncounter && !isViewingActive && (
        <span className="text-xs text-amber-600 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Read Only
        </span>
      )}
    </div>
  );
}
