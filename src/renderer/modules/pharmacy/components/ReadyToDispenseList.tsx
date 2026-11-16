import React, { useMemo, useState } from 'react';
import {
  User,
  Calendar,
  ChevronRight,
  Search,
  Pill,
  CheckCircle,
} from 'lucide-react';
import { Button, EmptyState } from '../../../components/ui';
import { SkeletonList } from '../../../components/ui/SkeletonLoader';
import { PrescriptionDTO } from '../dtos/pharmacy.dto';
import {
  formatPatientName,
  formatDetailedAge,
} from '../../patient-registration/dtos/patient.dto';
import { PaymentStatusDot } from '../../../components/workflow';
import { PaymentStatusMap } from '../../billing/hooks/useBillingOrders';

// =============================================================================
// Types
// =============================================================================

export interface DispenseEncounterGroup {
  encounter_id: string;
  patient: PrescriptionDTO['patient'];
  doctor: PrescriptionDTO['doctor'];
  encounter_date: string;
  prescriptions: PrescriptionDTO[];
  pending_count: number;
  dispensed_count: number;
  total_count: number;
}

interface ReadyToDispenseListProps {
  prescriptions: PrescriptionDTO[];
  isLoading?: boolean;
  onSelectEncounter: (group: DispenseEncounterGroup) => void;
  paymentStatusMap?: PaymentStatusMap;
}

// =============================================================================
// Helper: Group Prescriptions by Encounter for Dispensing
// =============================================================================

export function groupPrescriptionsForDispensing(
  prescriptions: PrescriptionDTO[],
): DispenseEncounterGroup[] {
  const groupMap = new Map<string, DispenseEncounterGroup>();

  for (const prescription of prescriptions) {
    const encounterId = prescription.encounter_id || 'no-encounter';

    if (!groupMap.has(encounterId)) {
      groupMap.set(encounterId, {
        encounter_id: encounterId,
        patient: prescription.patient,
        doctor: prescription.doctor,
        encounter_date: prescription.created_at || new Date().toISOString(),
        prescriptions: [],
        pending_count: 0,
        dispensed_count: 0,
        total_count: 0,
      });
    }

    const group = groupMap.get(encounterId)!;
    group.prescriptions.push(prescription);
    group.total_count += 1;
    // Count prescriptions that need dispensing (Pending, Accepted, or Partial)
    if (
      prescription.status === 'Pending' ||
      prescription.status === 'Accepted' ||
      prescription.status === 'Partial'
    ) {
      group.pending_count += 1;
    }
    if (prescription.status === 'Dispensed') {
      group.dispensed_count += 1;
    }
  }

  // Sort by encounter date descending (most recent first)
  return Array.from(groupMap.values()).sort(
    (a, b) =>
      new Date(b.encounter_date).getTime() -
      new Date(a.encounter_date).getTime(),
  );
}

// =============================================================================
// Component
// =============================================================================

export default function ReadyToDispenseList({
  prescriptions,
  isLoading = false,
  onSelectEncounter,
  paymentStatusMap = {},
}: ReadyToDispenseListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(true);

  // Group prescriptions by encounter
  const encounterGroups = useMemo(() => {
    const groups = groupPrescriptionsForDispensing(prescriptions);

    // Filter to only show groups with pending prescriptions if enabled
    if (showPendingOnly) {
      return groups.filter((g) => g.pending_count > 0);
    }

    return groups;
  }, [prescriptions, showPendingOnly]);

  // Filter by search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return encounterGroups;

    const query = searchTerm.toLowerCase();
    return encounterGroups.filter((group) => {
      const patientName = group.patient
        ? formatPatientName(group.patient).toLowerCase()
        : '';
      const doctorName = group.doctor
        ? `${group.doctor.first_name} ${group.doctor.last_name}`.toLowerCase()
        : '';
      const drugNames = group.prescriptions
        .map((p) => p.drug?.drug_name?.toLowerCase() || '')
        .join(' ');

      return (
        patientName.includes(query) ||
        doctorName.includes(query) ||
        drugNames.includes(query)
      );
    });
  }, [encounterGroups, searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <SkeletonList count={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by patient, doctor, or drug..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showPendingOnly ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowPendingOnly(true)}
          >
            Pending Dispense
          </Button>
          <Button
            variant={!showPendingOnly ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowPendingOnly(false)}
          >
            All
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {filteredGroups.length === 0 && (
        <EmptyState
          icon={Pill}
          title="No prescriptions ready"
          description={
            showPendingOnly
              ? 'No prescriptions pending dispense with verified payment'
              : 'No prescriptions found with verified payment'
          }
        />
      )}

      {/* Encounter Groups */}
      {filteredGroups.length > 0 && (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            // Get payment info for first prescription to show status
            const firstPrescription = group.prescriptions[0];
            const paymentInfo = firstPrescription
              ? paymentStatusMap[firstPrescription.prescription_id]
              : null;

            return (
              <div
                key={group.encounter_id}
                onClick={() => onSelectEncounter(group)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  {/* Left Side - Patient & Prescription Info */}
                  <div className="flex-1">
                    {/* Patient Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <User size={18} className="text-green-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {group.patient
                            ? formatPatientName(group.patient)
                            : 'Unknown Patient'}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          {group.patient && (
                            <>
                              <span>{group.patient.gender}</span>
                              <span>•</span>
                              <span>
                                {formatDetailedAge(group.patient.date_of_birth)}
                              </span>
                            </>
                          )}
                          {paymentInfo && (
                            <>
                              <span>•</span>
                              <PaymentStatusDot
                                status={
                                  paymentInfo.payment_status === 'Paid'
                                    ? 'Paid'
                                    : paymentInfo.payment_status === 'Paid_NHIS'
                                      ? 'Paid_NHIS'
                                      : paymentInfo.payment_status ===
                                          'Paid_Retainership'
                                        ? 'Paid_Retainership'
                                        : paymentInfo.payment_status ===
                                            'Waived'
                                          ? 'Waived'
                                          : 'Pending'
                                }
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Prescription Summary */}
                    <div className="flex items-center gap-4 text-sm mt-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar size={14} className="text-gray-400" />
                        {new Date(group.encounter_date).toLocaleDateString(
                          'en-GB',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          },
                        )}
                      </div>
                      {group.doctor && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <User size={14} className="text-gray-400" />
                          Dr. {group.doctor.first_name} {group.doctor.last_name}
                        </div>
                      )}
                    </div>

                    {/* Drug Names Preview */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {group.prescriptions.slice(0, 4).map((prescription) => (
                        <span
                          key={prescription.prescription_id}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            prescription.status === 'Dispensed'
                              ? 'bg-green-100 text-green-700'
                              : prescription.status === 'Partial'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {prescription.status === 'Dispensed' && (
                            <CheckCircle size={10} className="mr-1" />
                          )}
                          {prescription.drug?.drug_name || 'Unknown'}
                        </span>
                      ))}
                      {group.prescriptions.length > 4 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                          +{group.prescriptions.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Side - Stats & Arrow */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {group.total_count} item
                        {group.total_count !== 1 ? 's' : ''}
                      </div>
                      <div className="flex flex-col gap-1">
                        {group.pending_count > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            {group.pending_count} to dispense
                          </span>
                        )}
                        {group.dispensed_count > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {group.dispensed_count} dispensed
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      size={20}
                      className="text-gray-400 group-hover:text-green-600 transition-colors"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
