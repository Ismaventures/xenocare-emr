/**
 * =============================================================================
 * XENOCARE EMR - ENCOUNTER TABLE COMPONENT
 * Description: Modern, professional data table for displaying encounters
 * =============================================================================
 */

import React from 'react';
import {
  AlertTriangle,
  ChevronRight,
  Stethoscope,
  MoreVertical,
  XCircle,
} from 'lucide-react';
import {
  Encounter,
  getEncounterStatusColor,
  getPriorityColor,
  getVisitTypeColor,
  formatEncounterPatientName,
  formatEncounterDateTime,
  calculateWaitTime,
  isEncounterOverdue,
  EncounterStatus,
  VisitType,
  PriorityLevel,
} from '../dtos/encounter.dto';
import { useUpdateEncounterStatus } from '../hooks/useEncounter';
import { ConfirmDialog } from '../../../components/ui/Modal';
import {
  cancelEncounter,
  checkEncounterPaymentStatus,
} from '../../../lib/workflow/api';
import { useToast } from '../../../components/ui/Toast';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import {
  useEncounterSettings,
  getExpiryHoursForEncounter,
} from '../hooks/useEncounterSettings';

interface EncounterTableProps {
  encounters: Encounter[];
  isLoading?: boolean;
  onRowClick?: (encounter: Encounter) => void;
  showActions?: boolean;
}

const EncounterTable: React.FC<EncounterTableProps> = ({
  encounters,
  isLoading,
  onRowClick,
  showActions = true,
}) => {
  const updateStatus = useUpdateEncounterStatus();
  const { showToast } = useToast();
  const { data: expirySettings } = useEncounterSettings();
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = React.useState(false);
  const [encounterToCancel, setEncounterToCancel] =
    React.useState<Encounter | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = React.useState(false);

  const handleStatusChange = async (
    visitId: string,
    status: EncounterStatus,
  ) => {
    try {
      await updateStatus.mutateAsync({ visitId, status });
      setOpenMenuId(null);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleCancelClick = async (encounter: Encounter) => {
    setOpenMenuId(null);
    setIsCheckingPayment(true);
    setCancelError(null);

    try {
      // Check if encounter has paid orders before showing dialog
      const paymentStatus = await checkEncounterPaymentStatus(
        encounter.visit_id,
      );

      if (paymentStatus.hasPaidOrders) {
        showToast({
          type: 'error',
          title: 'Cannot Cancel',
          message: `${paymentStatus.paidOrdersCount} payment(s) totaling ₦${paymentStatus.totalPaidAmount.toLocaleString()} have been verified. Process a refund first.`,
        });
        return;
      }

      setEncounterToCancel(encounter);
      setCancelConfirmOpen(true);
    } catch (error) {
      console.error('Error checking payment status:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to check payment status',
      });
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!encounterToCancel) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      await cancelEncounter(
        encounterToCancel.visit_id,
        'Cancelled by user from encounter list',
      );
      showToast({
        type: 'success',
        title: 'Cancelled',
        message: 'Encounter cancelled successfully',
      });
      setCancelConfirmOpen(false);
      setEncounterToCancel(null);
      // Trigger a refetch of encounters
      await updateStatus.mutateAsync({
        visitId: encounterToCancel.visit_id,
        status: 'Cancelled',
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to cancel encounter';
      setCancelError(errorMessage);
      showToast({
        type: 'error',
        title: 'Cancel Failed',
        message: errorMessage,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  /**
   * Determine if patient is Inpatient or Outpatient based on visit type and admission status
   */
  const getPatientClassification = (
    encounter: Encounter,
  ): 'Inpatient' | 'Outpatient' => {
    // Check visit type for inpatient indicators
    const inpatientTypes = ['In-Patient', 'Inpatient', 'Admission', 'Ward'];
    if (
      inpatientTypes.some((type) =>
        encounter.visit_type?.toLowerCase().includes(type.toLowerCase()),
      )
    ) {
      return 'Inpatient';
    }
    // Check if encounter has admission-related fields
    if (encounter.discharge_date || (encounter as any).admission_id) {
      return 'Inpatient';
    }
    return 'Outpatient';
  };

  /**
   * Calculate encounter age and check if expired based on admin-configurable settings.
   * Falls back to 504 hours (3 weeks) if settings not loaded.
   */
  const getEncounterAgeStatus = (
    encounter: Encounter,
  ): { ageHours: number; isExpired: boolean } => {
    const ageHours =
      (Date.now() - new Date(encounter.created_at).getTime()) /
      (1000 * 60 * 60);
    const classification = getPatientClassification(encounter);

    // Inpatients expire on discharge, not by time
    if (classification === 'Inpatient') {
      return { ageHours, isExpired: false };
    }

    // Get configurable expiry hours based on OPD classification and encounter category
    const expiryHours = expirySettings
      ? getExpiryHoursForEncounter(
          expirySettings,
          (encounter as any).opd_classification,
          (encounter as any).encounter_category,
        )
      : 504; // Default: 3 weeks

    const isExpired =
      ageHours > expiryHours &&
      (encounter.status === 'Active' || encounter.status === 'Waiting');

    return { ageHours, isExpired };
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <SkeletonTable rows={6} columns={6} />
      </div>
    );
  }

  if (encounters.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm mb-3">
          <Stethoscope className="h-5 w-5 text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">
          No encounters found
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Create a new encounter to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* Minimal Column Headers */}
      <div className="grid grid-cols-12 gap-3 px-4 py-2">
        <div className="col-span-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Patient</span>
        </div>
        <div className="col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Encounter</span>
        </div>
        <div className="col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Clinic / Doctor</span>
        </div>
        <div className="col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Status</span>
        </div>
        <div className="col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Priority / Type</span>
        </div>
        {showActions && (
          <div className="col-span-1" />
        )}
      </div>

      {/* Encounter Rows */}
      {encounters.map((encounter) => {
          const priorityColor = getPriorityColor(
            (encounter.priority as PriorityLevel) || 'Normal',
          );
          const visitTypeColor = getVisitTypeColor(
            encounter.visit_type as VisitType,
          );
          const isOverdue = isEncounterOverdue(
            encounter,
            expirySettings?.overdueWarningMinutes,
          );
          const patientClassification = getPatientClassification(encounter);
          const { ageHours, isExpired } = getEncounterAgeStatus(encounter);
          const statusColor = getEncounterStatusColor(encounter.status);

          return (
            <div
              key={encounter.id || encounter.visit_id}
              onClick={() => onRowClick?.(encounter)}
              className={`group grid grid-cols-12 gap-3 items-center px-4 py-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                isOverdue
                  ? 'border-red-200 bg-red-50/40 hover:bg-red-50/70'
                  : isExpired
                    ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70'
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              {/* Patient */}
              <div className="col-span-3 flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    patientClassification === 'Inpatient'
                      ? 'bg-purple-50 text-purple-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {formatEncounterPatientName(encounter).charAt(0).toUpperCase()}
                  </div>
                  {isOverdue && (
                    <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 border-2 border-white animate-pulse" />
                  )}
                  {isExpired && !isOverdue && (
                    <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-500 border-2 border-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {formatEncounterPatientName(encounter)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] font-mono text-gray-400">
                      {encounter.patient?.emr_number || 'N/A'}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      patientClassification === 'Inpatient'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-sky-50 text-sky-600'
                    }`}>
                      {patientClassification === 'Inpatient' ? 'IPD' : 'OPD'}
                    </span>
                    {isExpired && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
                        EXPIRED
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Encounter # + Date */}
              <div className="col-span-2 min-w-0">
                <p className="text-sm font-mono text-gray-700 truncate">
                  {encounter.encounter_number || encounter.visit_id?.slice(0, 8) || '—'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-gray-400">
                    {encounter.encounter_date
                      ? new Date(encounter.encounter_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                      : new Date(encounter.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className="text-gray-300">&middot;</span>
                  <span className="text-[11px] text-gray-400">
                    {new Date(encounter.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {(encounter.status === 'Active' || encounter.status === 'Waiting') && ageHours >= 1 && (
                    <span className={`text-[11px] ${ageHours > 24 ? 'text-amber-500' : 'text-gray-400'}`}>
                      ({ageHours < 24 ? `${Math.floor(ageHours)}h` : `${Math.floor(ageHours / 24)}d`})
                    </span>
                  )}
                </div>
              </div>

              {/* Clinic / Doctor */}
              <div className="col-span-2 min-w-0">
                <p className="text-sm text-gray-700 truncate">
                  {encounter.clinic?.clinic_name || 'Unassigned'}
                </p>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                  {encounter.attending_doctor
                    ? `${encounter.attending_doctor.rank ? encounter.attending_doctor.rank + ' ' : ''}${encounter.attending_doctor.first_name} ${encounter.attending_doctor.last_name}`
                    : 'No doctor'}
                </p>
              </div>

              {/* Status */}
              <div className="col-span-2 flex items-center gap-2">
                {encounter.status === 'Active' && isExpired ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Expired
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColor.bg} ${statusColor.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      encounter.status === 'Active' ? 'bg-green-500 animate-pulse' :
                      encounter.status === 'Waiting' ? 'bg-amber-500' :
                      encounter.status === 'In Progress' ? 'bg-blue-500' :
                      encounter.status === 'Completed' ? 'bg-gray-400' :
                      'bg-red-400'
                    }`} />
                    {encounter.status === 'Active' ? 'Active Encounter' : encounter.status}
                  </span>
                )}
              </div>

              {/* Priority / Type */}
              <div className="col-span-2 flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityColor.bg} ${priorityColor.text}`}>
                  {(encounter.priority === 'Emergency' || encounter.priority === 'Urgent') && (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {encounter.priority || 'Normal'}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${visitTypeColor.bg} ${visitTypeColor.text}`}>
                  {encounter.visit_type?.split(' ')[0] || 'N/A'}
                </span>
              </div>

              {/* Actions */}
              {showActions && (
                <div className="col-span-1 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(
                          openMenuId === encounter.visit_id
                            ? null
                            : encounter.visit_id,
                        );
                      }}
                      className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-400" />
                    </button>

                    {openMenuId === encounter.visit_id && (
                      <div className="absolute right-0 top-8 z-20 w-48 rounded-xl border border-gray-100 bg-white py-1 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRowClick?.(encounter);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                          View Details
                        </button>

                        {(encounter.status === 'Active' ||
                          encounter.status === 'Waiting') && (
                          <>
                            <div className="my-1 mx-3 border-t border-gray-100" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelClick(encounter);
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Cancel Encounter
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 text-[11px] text-gray-400">
        <span>
          {encounters.length} encounter{encounters.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active Encounter</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Expired</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Done</span>
        </div>
      </div>

      {/* Cancel Encounter Confirmation Dialog */}
      <ConfirmDialog
        isOpen={cancelConfirmOpen}
        onClose={() => {
          setCancelConfirmOpen(false);
          setEncounterToCancel(null);
          setCancelError(null);
        }}
        onConfirm={handleConfirmCancel}
        title="Cancel Encounter"
        message={
          <div className="space-y-3">
            <p>
              Are you sure you want to cancel this encounter for{' '}
              <strong>
                {encounterToCancel
                  ? formatEncounterPatientName(encounterToCancel)
                  : ''}
              </strong>
              ?
            </p>

            {/* Patient Classification Badge */}
            {encounterToCancel && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Patient Type:</span>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${
                    getPatientClassification(encounterToCancel) === 'Inpatient'
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-sky-100 text-sky-700 border border-sky-200'
                  }`}
                >
                  {getPatientClassification(encounterToCancel) === 'Inpatient'
                    ? 'INPATIENT (IPD)'
                    : 'OUTPATIENT (OPD)'}
                </span>
              </div>
            )}

            {cancelError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800">❌ Error:</p>
                <p className="text-sm text-red-700">{cancelError}</p>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-medium text-amber-800 mb-2">
                ⚠️ Important Implications:
              </p>
              <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                <li>
                  All pending billing orders will be removed from the payment
                  queue
                </li>
                <li>Any unpaid charges will be voided</li>
                <li>Lab, radiology, and pharmacy orders may be affected</li>
                <li>
                  Clinical notes and records will be preserved but marked as
                  cancelled
                </li>
                <li>
                  <strong>
                    Encounters with verified payments cannot be cancelled
                  </strong>
                </li>
                <li>This action cannot be undone</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-800 mb-1">
                📋 Encounter Expiry Rules:
              </p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>
                  <strong>GOPD Outpatient:</strong> Expires after{' '}
                  {expirySettings
                    ? `${Math.round(expirySettings.gopdOutpatientHours / 24)} days`
                    : '3 weeks'}
                </li>
                <li>
                  <strong>Specialty Outpatient:</strong> Expires after{' '}
                  {expirySettings
                    ? `${Math.round(expirySettings.specialtyOutpatientHours / 24)} days`
                    : '3 weeks'}
                </li>
                <li>
                  <strong>Inpatient (IPD):</strong> Expires upon patient
                  discharge
                </li>
                <li>
                  Expiry durations are configurable in the Settings tab
                </li>
              </ul>
            </div>
          </div>
        }
        confirmText="Yes, Cancel Encounter"
        cancelText="Keep Encounter"
        variant="danger"
        isLoading={isCancelling}
      />
    </div>
  );
};

export default EncounterTable;
