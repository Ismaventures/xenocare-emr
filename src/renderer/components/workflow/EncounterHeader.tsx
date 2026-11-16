/**
 * Encounter Header Component
 *
 * Always-visible header showing patient and encounter context.
 * Displays patient identity, encounter status, and workflow stage.
 */

import React from 'react';
import {
  User,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  CreditCard,
  Activity,
  Lock,
} from 'lucide-react';
import {
  isNhisCategory,
  isNhisFeatureEnabled,
} from '../../config/features';
import {
  EncounterSummary,
  EncounterStatus,
} from '../../lib/encounter/validation';
import {
  getStageDisplayName,
  getStageColor,
  getStageOwnership,
} from '../../lib/workflow';

interface EncounterHeaderProps {
  encounter: EncounterSummary;
  onClose?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

// Status badge component
const StatusBadge: React.FC<{ status: EncounterStatus }> = ({ status }) => {
  const config = {
    Created: { bg: 'bg-blue-100', text: 'text-blue-800', icon: FileText },
    Active: { bg: 'bg-green-100', text: 'text-green-800', icon: Activity },
    Completed: { bg: 'bg-gray-100', text: 'text-gray-800', icon: CheckCircle },
    Closed: { bg: 'bg-gray-100', text: 'text-gray-800', icon: Lock },
    Cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
  };

  const { bg, text, icon: Icon } = config[status] || config.Active;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}
    >
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
};

// Priority badge
const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const config: Record<string, { bg: string; text: string }> = {
    Emergency: { bg: 'bg-red-100', text: 'text-red-800' },
    Urgent: { bg: 'bg-orange-100', text: 'text-orange-800' },
    Normal: { bg: 'bg-blue-100', text: 'text-blue-800' },
    Low: { bg: 'bg-gray-100', text: 'text-gray-600' },
  };

  const { bg, text } = config[priority] || config.Normal;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}
    >
      {priority}
    </span>
  );
};

// Payment category badge
const PaymentBadge: React.FC<{ category: string }> = ({ category }) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    Cash: { bg: 'bg-green-100', text: 'text-green-800', label: 'Cash' },
    'Military NHIS': {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: 'NHIS (Mil)',
    },
    'Civilian NHIS': {
      bg: 'bg-indigo-100',
      text: 'text-indigo-800',
      label: 'NHIS (Civ)',
    },
    Retainership: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      label: 'Retainer',
    },
    Private: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Private' },
  };

  const effectiveCategory =
    !isNhisFeatureEnabled() && isNhisCategory(category) ? 'Private' : category;
  const { bg, text, label } = config[effectiveCategory] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    label: effectiveCategory,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}
    >
      <CreditCard className="w-3 h-3" />
      {label}
    </span>
  );
};

// Format duration
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

// Format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Format time
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const EncounterHeader: React.FC<EncounterHeaderProps> = ({
  encounter,
  onClose,
  showActions = true,
  compact = false,
}) => {
  // Cast stage to WorkflowStage type (safe since we handle unknown stages)
  const stage =
    encounter.current_stage as import('../../lib/workflow').WorkflowStage;
  const stageOwnership = getStageOwnership(stage);
  const stageColor = getStageColor(stage);
  const stageName = getStageDisplayName(stage);
  const isClosed = !encounter.is_active;

  if (compact) {
    return (
      <div
        className={`bg-gradient-to-r from-green-700 to-green-600 text-white px-4 py-2 ${isClosed ? 'opacity-75' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="font-semibold">{encounter.patient_name}</span>
              <span className="text-green-200">({encounter.file_number})</span>
            </div>
            <span className="text-green-200">|</span>
            <span className="text-sm">
              Encounter: {encounter.encounter_number}
            </span>
            <StatusBadge status={encounter.encounter_status} />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${stageColor}`}
            >
              {stageName}
            </span>
            {isClosed && <Lock className="w-4 h-4 text-yellow-300" />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white border-b shadow-sm ${isClosed ? 'border-l-4 border-l-gray-400' : 'border-l-4 border-l-green-500'}`}
    >
      {/* Read-only warning for closed encounters */}
      {isClosed && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-800 font-medium">
            This encounter is {encounter.encounter_status.toLowerCase()} and
            read-only
          </span>
          {encounter.closed_reason && (
            <span className="text-sm text-yellow-600">
              — {encounter.closed_reason}
            </span>
          )}
        </div>
      )}

      <div className="px-4 py-3">
        {/* Top row: Patient info and status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-4">
            {/* Patient avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-bold text-lg">
              {encounter.patient_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>

            {/* Patient details */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {encounter.patient_name}
              </h2>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="font-medium text-green-700">
                  {encounter.file_number}
                </span>
                <span>•</span>
                <span>
                  Encounter:{' '}
                  <span className="font-medium">
                    {encounter.encounter_number}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={encounter.encounter_status} />
              <PriorityBadge priority={encounter.priority} />
            </div>
            <PaymentBadge category={encounter.payment_category} />
          </div>
        </div>

        {/* Middle row: Encounter details */}
        <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{formatDate(encounter.start_time)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>
              {formatTime(encounter.start_time)}
              {encounter.end_time && ` - ${formatTime(encounter.end_time)}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-gray-400" />
            <span>Duration: {formatDuration(encounter.duration_minutes)}</span>
          </div>
          {encounter.attending_doctor_name && (
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-gray-400" />
              <span>Dr. {encounter.attending_doctor_name}</span>
            </div>
          )}
        </div>

        {/* Chief complaint */}
        {encounter.chief_complaint && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Chief Complaint
            </span>
            <p className="text-sm text-gray-800 mt-0.5">
              {encounter.chief_complaint}
            </p>
          </div>
        )}

        {/* Bottom row: Workflow stage and counts */}
        <div className="flex items-center justify-between pt-2 border-t">
          {/* Current stage */}
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-lg ${stageColor}`}>
              <span className="text-sm font-medium">{stageName}</span>
            </div>
            <span className="text-xs text-gray-500">
              Owner:{' '}
              <span className="font-medium text-gray-700">
                {stageOwnership.owner}
              </span>
            </span>
          </div>

          {/* Activity counts */}
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-medium">
                {encounter.vitals_count}
              </span>
              <span>Vitals</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-medium">
                {encounter.consultation_count}
              </span>
              <span>Consults</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-medium">
                {encounter.lab_order_count}
              </span>
              <span>Labs</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 flex items-center justify-center font-medium">
                {encounter.radiology_order_count}
              </span>
              <span>Imaging</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-medium">
                {encounter.prescription_count}
              </span>
              <span>Rx</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncounterHeader;
