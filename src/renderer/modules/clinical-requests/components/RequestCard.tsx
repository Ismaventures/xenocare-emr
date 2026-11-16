/**
 * Request Card Component
 * ======================
 * Displays a single clinical request in a card format
 */

import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  User,
  Calendar,
  Clock,
  Building2,
  Bed,
  Stethoscope,
  AlertTriangle,
  ChevronRight,
  Phone,
} from 'lucide-react';
import {
  ClinicalRequestWithDetailsDTO,
  REQUEST_STATUS_CONFIG,
  URGENCY_CONFIG,
  REQUEST_TYPE_LABELS,
  isUrgent,
} from '../dtos/clinical-request.dto';

interface RequestCardProps {
  request: ClinicalRequestWithDetailsDTO;
  onClick?: (request: ClinicalRequestWithDetailsDTO) => void;
  showActions?: boolean;
  compact?: boolean;
}

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  onClick,
  showActions = true,
  compact = false,
}) => {
  const statusConfig = REQUEST_STATUS_CONFIG[request.status];
  const urgencyConfig = URGENCY_CONFIG[request.urgency];

  const calculateAge = (dob?: string) => {
    if (!dob) return '';
    const today = new Date();
    const birthDate = new Date(dob);
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    if (days < 0) {
      months--;
      const prev = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prev.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    if (years === 0 && months === 0) {
      const weeks = Math.floor(days / 7);
      const rem = days % 7;
      if (weeks > 0 && rem > 0) return `${weeks}w ${rem}d`;
      if (weeks > 0) return `${weeks}w`;
      return `${days}d`;
    }
    if (years === 0) {
      const parts = [`${months}m`];
      if (days > 0) parts.push(`${days}d`);
      return parts.join(' ');
    }
    const parts = [`${years}y`];
    if (months > 0) parts.push(`${months}m`);
    if (days > 0) parts.push(`${days}d`);
    return parts.join(' ');
  };

  if (compact) {
    return (
      <div
        onClick={() => onClick?.(request)}
        className={`
          p-3 border rounded-lg cursor-pointer transition-all
          hover:shadow-md hover:border-blue-300
          ${isUrgent(request) ? 'border-l-4 border-l-red-500' : 'border-gray-200'}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded ${urgencyConfig.bgColor} ${urgencyConfig.color}`}
            >
              {request.urgency}
            </span>
            <span className="font-medium text-sm">{request.patient_name}</span>
            <span className="text-xs text-gray-500">{request.emr_number}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded ${statusConfig.bgColor} ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-600 truncate">
          {REQUEST_TYPE_LABELS[request.request_type]}: {request.clinical_reason}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick?.(request)}
      className={`
        bg-white border rounded-lg shadow-sm overflow-hidden cursor-pointer
        transition-all hover:shadow-md
        ${isUrgent(request) ? 'border-l-4 border-l-red-500' : 'border-gray-200'}
      `}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-medium px-2 py-1 rounded ${urgencyConfig.bgColor} ${urgencyConfig.color}`}
          >
            {request.urgency}
          </span>
          <span className="font-medium text-gray-900">
            {REQUEST_TYPE_LABELS[request.request_type]}
          </span>
          <span className="text-xs text-gray-500">
            {request.request_number}
          </span>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${statusConfig.bgColor} ${statusConfig.color}`}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Patient Info */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-gray-900">
                {request.patient_name}
              </span>
              <span className="text-sm text-gray-500">
                ({request.patient_gender?.charAt(0)},{' '}
                {calculateAge(request.patient_dob)})
              </span>
            </div>
            <div className="text-sm text-gray-600 ml-6">
              EMR: {request.emr_number}
              {request.patient_phone && (
                <span className="ml-3 inline-flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {request.patient_phone}
                </span>
              )}
            </div>
          </div>
          {request.urgency === 'Emergency' && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-xs font-medium">EMERGENCY</span>
            </div>
          )}
        </div>

        {/* Clinical Reason */}
        <div className="mb-3 p-2 bg-blue-50 rounded text-sm text-gray-700">
          <span className="font-medium">Reason: </span>
          {request.clinical_reason}
        </div>

        {/* Request Type Specific Info */}
        {request.request_type === 'Admission' && (
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
            {request.admission_type && (
              <div className="flex items-center gap-2">
                <Bed className="w-4 h-4 text-gray-400" />
                <span>Type: {request.admission_type}</span>
              </div>
            )}
            {request.level_of_care && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>Level: {request.level_of_care}</span>
              </div>
            )}
            {request.target_ward_name && (
              <div className="flex items-center gap-2 col-span-2">
                <span>Suggested Ward: {request.target_ward_name}</span>
                {request.available_beds !== undefined && (
                  <span className="text-xs text-gray-500">
                    ({request.available_beds} beds available)
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {(request.request_type === 'Procedure' ||
          request.request_type === 'Surgery') && (
          <div className="mb-3 text-sm">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{request.procedure_name}</span>
              {request.procedure_code && (
                <span className="text-xs text-gray-500">
                  ({request.procedure_code})
                </span>
              )}
            </div>
            {request.procedure_notes && (
              <div className="mt-1 text-gray-600 ml-6">
                {request.procedure_notes}
              </div>
            )}
          </div>
        )}

        {/* Requesting Doctor */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <User className="w-4 h-4 text-gray-400" />
            <span>Dr. {request.requesting_doctor_name}</span>
          </div>
          {request.requesting_department_name && (
            <div className="flex items-center gap-1">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span>{request.requesting_department_name}</span>
            </div>
          )}
        </div>

        {/* Schedule Info (if scheduled) */}
        {request.scheduled_date && (
          <div className="mb-3 p-2 bg-purple-50 rounded text-sm">
            <div className="flex items-center gap-2 text-purple-700">
              <Calendar className="w-4 h-4" />
              <span>
                Scheduled:{' '}
                {format(new Date(request.scheduled_date), 'EEEE, MMM d, yyyy')}
              </span>
              {request.scheduled_time && (
                <span>at {request.scheduled_time}</span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              Created {formatDistanceToNow(new Date(request.created_at))} ago
            </span>
          </div>
          {request.suggested_timeframe && (
            <span>Timeframe: {request.suggested_timeframe}</span>
          )}
          {showActions && (
            <button className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              View Details <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestCard;
