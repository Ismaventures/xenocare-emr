// =============================================================================
// Provisional Approvals Card Component
// =============================================================================
// Dashboard widget showing provisional authorizations awaiting official codes

import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  Edit3,
  CheckCircle,
  ChevronRight,
  User,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { useProvisionalApprovals, useEnterOfficialCode } from '../hooks';
import { useAuth } from '../../../contexts/AuthContext';
import { SkeletonList } from '../../../components/ui/SkeletonLoader';

interface ProvisionalApproval {
  authorization_id: string;
  patient_id: string;
  patient_name: string;
  emr_number: string;
  specific_service_type: string | null;
  provisional_reason: string | null;
  provisional_approved_at: string;
  approved_by_name: string | null;
  expiry_date: string;
  hours_since_approval: number;
  urgency_status: 'normal' | 'urgent' | 'overdue';
}

interface EnterCodeModalProps {
  approval: ProvisionalApproval;
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
  isSubmitting: boolean;
}

function EnterCodeModal({
  approval,
  onClose,
  onSubmit,
  isSubmitting,
}: EnterCodeModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Authorization code is required');
      return;
    }
    try {
      await onSubmit(code.trim());
      onClose();
    } catch {
      setError('Failed to save authorization code');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Enter Official NHIS Code
          </h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">
                {approval.patient_name}
              </p>
              <p className="text-sm text-gray-600">
                EMR: {approval.emr_number}
              </p>
              <p className="text-sm text-gray-600">
                Service:{' '}
                {approval.specific_service_type?.replace(/_/g, ' ') ||
                  'General'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Provisional reason:{' '}
                {approval.provisional_reason || 'Not specified'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Official Authorization Code{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError('');
                }}
                placeholder="Enter NHIS authorization code"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Save Code
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getUrgencyConfig(status: string) {
  switch (status) {
    case 'overdue':
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
        icon: <AlertTriangle size={14} />,
        label: 'Overdue (>48h)',
      };
    case 'urgent':
      return {
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-200',
        icon: <Clock size={14} />,
        label: 'Urgent (>24h)',
      };
    default:
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-200',
        icon: <Clock size={14} />,
        label: 'Normal',
      };
  }
}

function formatHours(hours: number): string {
  if (hours < 1) return 'Less than 1 hour';
  if (hours < 24) return `${Math.floor(hours)} hours`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  return `${days}d ${remainingHours}h`;
}

export function ProvisionalApprovalsCard() {
  const { staff } = useAuth();
  const {
    data: provisionalApprovalsData,
    isLoading,
    refetch,
  } = useProvisionalApprovals(20);
  const enterCodeMutation = useEnterOfficialCode();
  const [selectedApproval, setSelectedApproval] =
    useState<ProvisionalApproval | null>(null);

  const handleEnterCode = async (code: string) => {
    if (!selectedApproval || !staff?.id) return;

    await enterCodeMutation.mutateAsync({
      dto: {
        authorization_id: selectedApproval.authorization_id,
        official_code: code,
      },
      enteredBy: staff.id,
    });

    refetch();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-full">
            <Clock size={20} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Provisional Approvals
          </h2>
        </div>
        <SkeletonList count={3} hasAction={false} />
      </div>
    );
  }

  // Transform nhis_approvals data to the card's expected format
  const rawApprovals = provisionalApprovalsData?.data || [];
  const approvals: ProvisionalApproval[] = rawApprovals.map((a: any) => {
    const decidedAt = a.decided_at ? new Date(a.decided_at) : new Date();
    const hoursSinceApproval =
      (Date.now() - decidedAt.getTime()) / (1000 * 60 * 60);

    return {
      authorization_id: a.id, // Using approval id as authorization_id for the modal
      patient_id: a.patient_id,
      patient_name: a.patient
        ? `${a.patient.first_name || ''} ${a.patient.surname || ''}`.trim()
        : 'Unknown',
      emr_number: a.patient?.emr_number || a.patient_emr_number || 'N/A',
      specific_service_type: a.service_type || a.service_category || null,
      provisional_reason: a.decision_notes || null,
      provisional_approved_at: a.decided_at || a.requested_at,
      approved_by_name: a.decider
        ? `${a.decider.first_name || ''} ${a.decider.last_name || ''}`.trim()
        : null,
      expiry_date: a.expiry_date || '',
      hours_since_approval: hoursSinceApproval,
      urgency_status:
        hoursSinceApproval > 48
          ? 'overdue'
          : hoursSinceApproval > 24
            ? 'urgent'
            : 'normal',
    };
  });

  const overdueCount = approvals.filter(
    (a) => a.urgency_status === 'overdue',
  ).length;
  const urgentCount = approvals.filter(
    (a) => a.urgency_status === 'urgent',
  ).length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-full">
            <Clock size={20} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Provisional Approvals
            </h2>
            <p className="text-sm text-gray-500">
              Awaiting official NHIS codes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              {overdueCount} overdue
            </span>
          )}
          {urgentCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
              {urgentCount} urgent
            </span>
          )}
          <span className="text-sm font-medium text-gray-600">
            {approvals.length} total
          </span>
        </div>
      </div>

      {approvals.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <CheckCircle size={32} className="mx-auto text-green-400 mb-2" />
          <p className="text-gray-500">No provisional approvals pending</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {approvals.slice(0, 10).map((approval) => {
              const urgencyConfig = getUrgencyConfig(approval.urgency_status);
              return (
                <div
                  key={approval.authorization_id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-full ${urgencyConfig.bgColor}`}
                      >
                        <User size={16} className={urgencyConfig.color} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {approval.patient_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {approval.emr_number} •{' '}
                          {approval.specific_service_type?.replace(/_/g, ' ') ||
                            'General'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${urgencyConfig.bgColor} ${urgencyConfig.color}`}
                          >
                            {urgencyConfig.icon}
                            {formatHours(approval.hours_since_approval)} ago
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedApproval(approval)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit3 size={14} />
                      Enter Code
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {approvals.length > 10 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mx-auto">
                View all {approvals.length} provisional approvals
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {selectedApproval && (
        <EnterCodeModal
          approval={selectedApproval}
          onClose={() => setSelectedApproval(null)}
          onSubmit={handleEnterCode}
          isSubmitting={enterCodeMutation.isPending}
        />
      )}
    </div>
  );
}

export default ProvisionalApprovalsCard;
