// =============================================================================
// NHIS Provisional Verification Queue Component
// =============================================================================
// Displays all provisionally approved NHIS services that require official
// authorization code verification before being removed from the queue.
//
// Per requirement: No provisionally approved item disappears from the queue
// until an official NHIS authorization code is entered and verified.
// =============================================================================

import React, { useState } from 'react';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Stethoscope,
  Calendar,
  FileText,
  RefreshCw,
  Shield,
  Search,
  Eye,
  Smile,
  Activity,
  Scissors,
  FlaskConical,
  Pill,
  Radio,
  Key,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from '../../../components/ui/FormElements';
import { Modal } from '../../../components/ui';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';
import { SkeletonList } from '../../../components/ui/SkeletonLoader';
import {
  useAllProvisionalApprovals,
  useVerifyProvisionalApproval,
} from '../hooks';
import { usePatient } from '../../patient-registration/hooks/usePatient';
import { PayerDetailsCard } from './PayerDetailsCard';
import type { PayerInfo } from '../../../types/database.types';

// =============================================================================
// Constants
// =============================================================================

const SERVICE_TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  specialty: {
    icon: Stethoscope,
    label: 'Specialty Referral',
    color: 'text-violet-600 bg-violet-100',
  },
  lab: {
    icon: FlaskConical,
    label: 'Laboratory',
    color: 'text-blue-600 bg-blue-100',
  },
  radiology: {
    icon: Radio,
    label: 'Radiology',
    color: 'text-green-600 bg-green-100',
  },
  pharmacy: {
    icon: Pill,
    label: 'Pharmacy',
    color: 'text-amber-600 bg-amber-100',
  },
  procedure: {
    icon: Scissors,
    label: 'Procedure',
    color: 'text-rose-600 bg-rose-100',
  },
};

const URGENCY_COLORS: Record<string, string> = {
  Routine: 'bg-gray-100 text-gray-700',
  Urgent: 'bg-orange-100 text-orange-700',
  Stat: 'bg-red-100 text-red-700',
  Emergency: 'bg-red-200 text-red-800',
};

// =============================================================================
// Component
// =============================================================================

export function NhisProvisionalVerificationQueue() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const {
    data: provisionalItems = [],
    isLoading,
    refetch,
  } = useAllProvisionalApprovals();
  const verifyMutation = useVerifyProvisionalApproval();

  const [searchQuery, setSearchQuery] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');

  // Modal states
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [authorizationCode, setAuthorizationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch full patient data for payer details when an item is selected
  const { data: fullPatient } = usePatient(selectedItem?.patient_id || '');

  // Filter items
  const filteredItems = provisionalItems.filter((item) => {
    const matchesSearch =
      item.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.emr_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.service_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      serviceTypeFilter === 'all' || item.service_type === serviceTypeFilter;
    return matchesSearch && matchesType;
  });

  const handleOpenVerifyModal = (item: any) => {
    setSelectedItem(item);
    setAuthorizationCode('');
    setVerifyModalOpen(true);
  };

  const handleVerify = async () => {
    if (!selectedItem || !authorizationCode.trim()) {
      showToast({
        title: 'Authorization Code Required',
        message: 'Please enter the official NHIS authorization code',
        type: 'error',
      });
      return;
    }

    setIsVerifying(true);
    try {
      await verifyMutation.mutateAsync({
        itemId: selectedItem.id,
        serviceType: selectedItem.service_type,
        authorizationCode: authorizationCode.trim(),
        verifiedBy: user?.id || '',
      });

      showToast({
        title: 'Authorization Verified',
        message: `${selectedItem.service_name} has been verified with code: ${authorizationCode}`,
        type: 'success',
      });
      setVerifyModalOpen(false);
      refetch();
    } catch (error) {
      showToast({
        title: 'Verification Failed',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to verify authorization',
        type: 'error',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Clock size={20} className="text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Provisional Approvals - Pending Verification
            </h2>
            <p className="text-sm text-gray-500">
              Services approved provisionally, awaiting official NHIS
              authorization codes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {provisionalItems.length > 0 && (
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              {provisionalItems.length} pending verification
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw size={14} className="mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle
          className="text-amber-600 flex-shrink-0 mt-0.5"
          size={20}
        />
        <div>
          <h3 className="font-medium text-amber-800">Verification Required</h3>
          <p className="text-sm text-amber-700 mt-1">
            These services were approved provisionally without an official NHIS
            authorization code. They will remain in this queue until verified
            with an official code.
            <strong> Do not remove items manually.</strong>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient name, EMR, or service..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        <select
          value={serviceTypeFilter}
          onChange={(e) => setServiceTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Service Types</option>
          {Object.entries(SERVICE_TYPE_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* Queue List */}
      {isLoading ? (
        <div className="p-4">
          <SkeletonList count={4} />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <CheckCircle size={48} className="mx-auto text-green-400 mb-3" />
          <p className="text-gray-600 font-medium">
            No pending provisional approvals
          </p>
          <p className="text-sm text-gray-500 mt-1">
            All provisional approvals have been verified with official codes
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const typeConfig =
              SERVICE_TYPE_CONFIG[item.service_type] ||
              SERVICE_TYPE_CONFIG.specialty;
            const TypeIcon = typeConfig.icon;

            return (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-orange-200 p-4 hover:border-orange-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Service Info */}
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`p-2 rounded-lg ${typeConfig.color.split(' ')[1]}`}
                    >
                      <TypeIcon
                        size={20}
                        className={typeConfig.color.split(' ')[0]}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {item.service_name}
                        </h3>
                        {item.urgency && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${URGENCY_COLORS[item.urgency] || URGENCY_COLORS.Routine}`}
                          >
                            {item.urgency}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          PROVISIONAL
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {item.patient_name}
                        </span>
                        <span>•</span>
                        <span>{item.emr_number}</span>
                        {item.encounter_number && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600 font-medium">
                              {item.encounter_number}
                            </span>
                          </>
                        )}
                      </div>
                      {item.provisional_reason && (
                        <p className="mt-2 text-sm text-orange-600 bg-orange-50 rounded p-2">
                          <strong>Provisional Reason:</strong>{' '}
                          {item.provisional_reason}
                        </p>
                      )}
                      {item.approved_at && (
                        <p className="mt-1 text-xs text-gray-400">
                          Provisionally approved{' '}
                          {formatDistanceToNow(new Date(item.approved_at), {
                            addSuffix: true,
                          })}
                          {item.approved_by_name &&
                            ` by ${item.approved_by_name}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Verify Action */}
                  <div className="flex items-center">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenVerifyModal(item)}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Key size={14} className="mr-1" />
                      Enter Auth Code
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Verify Modal */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title="Verify Provisional Approval"
        size="md"
      >
        {selectedItem && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-orange-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedItem.service_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedItem.patient_name} • {selectedItem.emr_number}
                  </p>
                  {selectedItem.encounter_number && (
                    <p className="text-sm text-blue-600 font-medium mt-1">
                      {selectedItem.encounter_number}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payer / Scheme Details */}
            <PayerDetailsCard
              payerInfo={fullPatient?.payer_info as PayerInfo | null}
              nhisNumber={fullPatient?.nhis_number}
              insuranceType={fullPatient?.insurance_type}
              patientCategory={fullPatient?.patient_category}
              compact
            />

            {/* Provisional Reason */}
            {selectedItem.provisional_reason && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-700">
                  <strong>Provisional Reason:</strong>{' '}
                  {selectedItem.provisional_reason}
                </p>
              </div>
            )}

            {/* Authorization Code Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Official NHIS Authorization Code *
              </label>
              <input
                type="text"
                value={authorizationCode}
                onChange={(e) =>
                  setAuthorizationCode(e.target.value.toUpperCase())
                }
                placeholder="Enter the official authorization code..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-lg uppercase tracking-wider"
                autoFocus
              />
              <p className="text-xs text-gray-500">
                Enter the official NHIS authorization code received from NHIS HQ
                or HMO portal
              </p>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle size={16} className="text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-700">
                Once verified, this service will be removed from the provisional
                queue and marked as fully authorized in the patient's record.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setVerifyModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleVerify}
                disabled={isVerifying || !authorizationCode.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isVerifying ? 'Verifying...' : 'Verify Authorization'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default NhisProvisionalVerificationQueue;
