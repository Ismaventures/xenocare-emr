// =============================================================================
// NDC MEDICAL CENTRE EMR - Patient Admission Card Component
// Compact card view of patient admission details
// =============================================================================

import React from 'react';
import {
  User,
  Building2,
  Bed,
  Clock,
  Calendar,
  AlertTriangle,
  Stethoscope,
  FileText,
  MoreVertical,
  Eye,
  LogOut,
  ArrowRightLeft,
  Activity,
} from 'lucide-react';
import type {
  AdmissionWithDetails,
  AcuityLevel,
} from '../../../types/database.types';

interface PatientAdmissionCardProps {
  admission: AdmissionWithDetails;
  onViewDetails?: () => void;
  onDischarge?: () => void;
  onTransfer?: () => void;
  onWardRound?: () => void;
  compact?: boolean;
}

const acuityConfig: Record<
  AcuityLevel,
  { color: string; bgColor: string; label: string }
> = {
  critical: {
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-200',
    label: 'Critical',
  },
  high: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 border-orange-200',
    label: 'High',
  },
  moderate: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 border-yellow-200',
    label: 'Moderate',
  },
  low: {
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-200',
    label: 'Low',
  },
};

const PatientAdmissionCard: React.FC<PatientAdmissionCardProps> = ({
  admission,
  onViewDetails,
  onDischarge,
  onTransfer,
  onWardRound,
  compact = false,
}) => {
  const [showActions, setShowActions] = React.useState(false);

  const los = Math.floor(
    (Date.now() - new Date(admission.admission_date).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const acuity = acuityConfig[admission.acuity_level || 'moderate'];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (compact) {
    return (
      <div className={`p-3 rounded-lg border ${acuity.bgColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              <User className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {admission.admission_number}
              </p>
              <p className="text-xs text-gray-500">Day {los + 1}</p>
            </div>
          </div>
          {admission.isolation_required && (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </div>
        <p className="mt-2 text-xs text-gray-600 line-clamp-1">
          {admission.admitting_diagnosis}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Acuity Bar */}
      <div
        className={`h-1.5 ${acuity.bgColor.replace('bg-', 'bg-').replace('-100', '-500')}`}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">
                  {admission.admission_number}
                </p>
                {admission.isolation_required && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    Isolation
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Patient ID: {admission.patient_id.slice(0, 8)}
              </p>
            </div>
          </div>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {showActions && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-10">
                {onViewDetails && (
                  <button
                    onClick={() => {
                      onViewDetails();
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                )}
                {onWardRound && (
                  <button
                    onClick={() => {
                      onWardRound();
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Ward Round Note
                  </button>
                )}
                {onTransfer && (
                  <button
                    onClick={() => {
                      onTransfer();
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Transfer Bed
                  </button>
                )}
                {onDischarge && admission.admission_status === 'admitted' && (
                  <button
                    onClick={() => {
                      onDischarge();
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Discharge
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Diagnosis */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Admitting Diagnosis
          </p>
          <p className="text-sm text-gray-900">
            {admission.admitting_diagnosis}
          </p>
        </div>

        {/* Stats Row */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Clock className="h-4 w-4" />
            </div>
            <p className="font-semibold text-gray-900">{los}</p>
            <p className="text-xs text-gray-500">Days LOS</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Activity className="h-4 w-4" />
            </div>
            <p className={`font-semibold ${acuity.color}`}>{acuity.label}</p>
            <p className="text-xs text-gray-500">Acuity</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Bed className="h-4 w-4" />
            </div>
            <p className="font-semibold text-gray-900 capitalize">
              {admission.admission_type}
            </p>
            <p className="text-xs text-gray-500">Type</p>
          </div>
        </div>

        {/* Details */}
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>Admitted: {formatDate(admission.admission_date)}</span>
          </div>
          {admission.expected_discharge_date && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>
                Expected Discharge:{' '}
                {formatDate(admission.expected_discharge_date)}
              </span>
            </div>
          )}
        </div>

        {/* Chief Complaint */}
        {admission.chief_complaint && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Chief Complaint
            </p>
            <p className="text-sm text-gray-700">{admission.chief_complaint}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t flex gap-2">
          {onWardRound && (
            <button
              onClick={onWardRound}
              className="flex-1 flex items-center justify-center gap-2 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
            >
              <FileText className="h-4 w-4" />
              Ward Round
            </button>
          )}
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              <Eye className="h-4 w-4" />
              Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientAdmissionCard;
