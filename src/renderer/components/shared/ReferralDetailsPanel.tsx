/**
 * =============================================================================
 * XENOCARE EMR - REFERRAL DETAILS PANEL
 * Component for displaying referral information before specialty exam
 * Shows referral reason, urgency, referring doctor, and patient medical records
 * =============================================================================
 */

import React, { useState } from 'react';
import {
  ArrowRight,
  User,
  Stethoscope,
  Clock,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Calendar,
  Building2,
  MessageSquare,
  CheckCircle,
  XCircle,
  Eye,
  ClipboardList,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/FormElements';
import { Modal } from '../ui/Modal';
import PatientMedicalRecordsPanel from './PatientMedicalRecordsPanel';
import type { ClinicalRequestWithDetailsDTO } from '../../modules/clinical-requests/dtos/clinical-request.dto';

// =============================================================================
// Types
// =============================================================================

interface ReferralDetailsPanelProps {
  referral: ClinicalRequestWithDetailsDTO;
  onStartExam: () => void;
  onAccept?: () => void;
  onReject?: (reason: string) => void;
  isLoading?: boolean;
  showMedicalRecords?: boolean;
  specialty: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDateTime(dateString: string): string {
  try {
    return format(new Date(dateString), 'dd MMM yyyy, HH:mm');
  } catch {
    return dateString;
  }
}

const urgencyColors: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Routine: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-300',
  },
  Urgent: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
  },
  Emergency: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
  },
  Stat: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  Pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  Approved: { bg: 'bg-green-100', text: 'text-green-800' },
  In_Progress: { bg: 'bg-blue-100', text: 'text-blue-800' },
  Completed: { bg: 'bg-gray-100', text: 'text-gray-800' },
  Rejected: { bg: 'bg-red-100', text: 'text-red-800' },
  Cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
};

// =============================================================================
// Main Component
// =============================================================================

export default function ReferralDetailsPanel({
  referral,
  onStartExam,
  onAccept,
  onReject,
  isLoading = false,
  showMedicalRecords = true,
  specialty,
}: ReferralDetailsPanelProps) {
  const [showRecords, setShowRecords] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const urgency = urgencyColors[referral.urgency] || urgencyColors.Routine;
  const status = statusColors[referral.status] || statusColors.Pending;

  const handleReject = () => {
    if (onReject && rejectReason.trim()) {
      onReject(rejectReason);
      setShowRejectDialog(false);
      setRejectReason('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header with Urgency Banner */}
      <div className={`px-6 py-4 ${urgency.bg} border-b ${urgency.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/50">
              <FileText size={20} className={urgency.text} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Referral to {specialty}
              </h3>
              <p className="text-sm text-gray-600">
                Request #{referral.request_number || referral.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${urgency.bg} ${urgency.text} border ${urgency.border}`}
            >
              {referral.urgency || 'Routine'}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}
            >
              {referral.status?.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Patient Info */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
              <User size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-lg">
                {referral.patient_name || 'Unknown Patient'}
              </h4>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="font-mono text-blue-600">
                  {referral.emr_number}
                </span>
                {referral.patient_gender && (
                  <span>
                    {referral.patient_gender === 'Male' ? '♂ Male' : '♀ Female'}
                  </span>
                )}
                {referral.encounter_number && (
                  <span className="flex items-center gap-1">
                    <ClipboardList size={14} />
                    {referral.encounter_number}
                  </span>
                )}
              </div>
            </div>
          </div>

          {showMedicalRecords && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRecords(!showRecords)}
            >
              <Eye size={16} className="mr-1" />
              {showRecords ? 'Hide' : 'View'} Medical Records
              {showRecords ? (
                <ChevronUp size={16} className="ml-1" />
              ) : (
                <ChevronDown size={16} className="ml-1" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Referral Details */}
      <div className="px-6 py-4 space-y-4">
        {/* Reason for Referral - PROMINENT */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <MessageSquare size={18} />
            Reason for Referral
          </h5>
          <p className="text-gray-800 whitespace-pre-wrap">
            {referral.clinical_reason ||
              referral.notes ||
              'No reason specified'}
          </p>
        </div>

        {/* Additional Notes */}
        {referral.notes && referral.notes !== referral.clinical_reason && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FileText size={18} />
              Additional Notes
            </h5>
            <p className="text-gray-600 whitespace-pre-wrap">
              {referral.notes}
            </p>
          </div>
        )}

        {/* Referral Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Referring Doctor */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
              Referred By
            </p>
            <div className="flex items-center gap-2">
              <Stethoscope size={16} className="text-gray-400" />
              <span className="font-medium text-gray-900">
                {referral.requesting_doctor_name || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Department */}
          {referral.requesting_department_name && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">
                From Department
              </p>
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-gray-400" />
                <span className="font-medium text-gray-900">
                  {referral.requesting_department_name}
                </span>
              </div>
            </div>
          )}

          {/* Referral Date */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
              Referral Date
            </p>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <span className="font-medium text-gray-900">
                {referral.created_at
                  ? formatDateTime(referral.created_at)
                  : '—'}
              </span>
            </div>
          </div>

          {/* Time Since Referral */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">
              Time Waiting
            </p>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              <span className="font-medium text-gray-900">
                {referral.created_at
                  ? formatDistanceToNow(new Date(referral.created_at), {
                      addSuffix: false,
                    })
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Medical Records Panel (Expandable) */}
      {showRecords && referral.patient_id && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <PatientMedicalRecordsPanel
            patientId={referral.patient_id}
            encounterId={referral.encounter_id}
            showHeader={false}
            defaultTab="overview"
            maxHeight="500px"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onAccept && referral.status === 'Pending' && (
            <Button
              variant="outline"
              onClick={onAccept}
              disabled={isLoading}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <CheckCircle size={16} className="mr-1" />
              Accept Referral
            </Button>
          )}
          {onReject && referral.status === 'Pending' && (
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              disabled={isLoading}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <XCircle size={16} className="mr-1" />
              Decline
            </Button>
          )}
        </div>

        <Button
          variant="primary"
          onClick={onStartExam}
          disabled={isLoading || !referral.patient_id || !referral.encounter_id}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <ArrowRight size={16} className="mr-1" />
          Start {specialty} Exam
        </Button>
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <Modal
          isOpen={showRejectDialog}
          onClose={() => setShowRejectDialog(false)}
          title="Decline Referral"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Please provide a reason for declining this referral. The referring
              doctor will be notified.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Declining
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter reason..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowRejectDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                Confirm Decline
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// =============================================================================
// Referral Details Modal - For viewing referral from a list
// =============================================================================

interface ReferralDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  referral: ClinicalRequestWithDetailsDTO | null;
  onStartExam: () => void;
  onAccept?: () => void;
  onReject?: (reason: string) => void;
  isLoading?: boolean;
  specialty: string;
}

export function ReferralDetailsModal({
  isOpen,
  onClose,
  referral,
  onStartExam,
  onAccept,
  onReject,
  isLoading = false,
  specialty,
}: ReferralDetailsModalProps) {
  if (!referral) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl" noPadding>
      <ReferralDetailsPanel
        referral={referral}
        onStartExam={() => {
          onStartExam();
          onClose();
        }}
        onAccept={onAccept}
        onReject={onReject}
        isLoading={isLoading}
        showMedicalRecords
        specialty={specialty}
      />
    </Modal>
  );
}
