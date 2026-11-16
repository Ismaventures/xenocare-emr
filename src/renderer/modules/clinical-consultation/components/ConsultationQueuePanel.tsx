// =============================================================================
// Consultation Queue Panel - Full Width Table Design
// =============================================================================
// Doctors within the same department can view and act on all patient requests.
// When a doctor starts consultation, the patient is removed from the queue
// to prevent duplicate clinical documentation.
// =============================================================================

import React, { useMemo, useCallback, useState } from 'react';
import {
  Users,
  Clock,
  Stethoscope,
  RefreshCw,
  Play,
  FileText,
  AlertTriangle,
  Activity,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useActiveEncounters,
  EncounterDTO,
  useStartConsultation,
} from '../../../lib/workflow';
import { DataTable, EmptyState } from '../../../components/ui/DataDisplay';
import { Button } from '../../../components/ui/FormElements';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';

interface ConsultationQueuePanelProps {
  onSelectPatient: (encounter: EncounterDTO) => void;
  selectedPatientId?: string;
}

export function ConsultationQueuePanel({
  onSelectPatient,
  selectedPatientId,
}: ConsultationQueuePanelProps) {
  const navigate = useNavigate();
  const { data: encounters, isLoading, refetch } = useActiveEncounters();
  const { staff } = useAuth();
  const startConsultation = useStartConsultation();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter patients ready for consultation
  // Only show patients who:
  // 1. Are in Active status
  // 2. Have completed nursing vitals (current_stage === 'consultation') or returning for reviews
  // 3. Are NOT already "In Progress" by ANOTHER doctor
  //    - If "In Progress" by current doctor, they should still see the patient
  //    - If "In Progress" by another doctor, hide from queue
  // 4. Do NOT have a specialty_code (specialty patients go to specialty dashboards)
  const consultationReady = useMemo(() => {
    if (!encounters) return [];
    const currentStaffId = staff?.id;

    return encounters
      .filter((enc) => {
        // Must be active
        if (enc.status !== 'Active') return false;

        // Exclude specialty patients - they go to their specialty dashboard
        // Only show in general Consultation queue if specialty_code is null
        if (enc.queue_entry?.specialty_code) {
          return false;
        }

        // Must be in a consultation-ready stage
        const readyStages = [
          'consultation',
          'doctor_review',
          'lab_results',
          'radiology_results',
        ];
        if (!readyStages.includes(enc.current_stage)) return false;

        // Handle "In Progress" patients:
        // - Keep visible for the attending doctor (assigned_to matches current user)
        // - Hide from all other doctors to prevent duplicate consultations
        if (enc.queue_entry?.status === 'In Progress') {
          const assignedDoctorId = enc.queue_entry.assigned_to;
          // Only show to the doctor who started the consultation
          if (assignedDoctorId !== currentStaffId) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Priority sort: Emergency > Urgent > Normal
        const priorityOrder = { Emergency: 0, Urgent: 1, Normal: 2 };
        const priorityDiff =
          priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        // Then by registration time (oldest first - FIFO)
        return (
          new Date(a.registration_time).getTime() -
          new Date(b.registration_time).getTime()
        );
      });
  }, [encounters, staff?.id]);

  // Apply search filter on top of consultationReady
  const filteredQueue = useMemo(() => {
    if (!searchQuery.trim()) return consultationReady;
    const q = searchQuery.toLowerCase();
    return consultationReady.filter((enc) => {
      const firstName = enc.patient?.first_name?.toLowerCase() || '';
      const surname = enc.patient?.surname?.toLowerCase() || '';
      const emr = enc.patient?.emr_number?.toLowerCase() || '';
      const encounterNum = enc.encounter_number?.toLowerCase() || '';
      const visitType = enc.visit_type?.toLowerCase() || '';
      return (
        firstName.includes(q) ||
        surname.includes(q) ||
        `${firstName} ${surname}`.includes(q) ||
        emr.includes(q) ||
        encounterNum.includes(q) ||
        visitType.includes(q)
      );
    });
  }, [consultationReady, searchQuery]);

  const formatWaitTime = (registrationTime: string) => {
    const start = new Date(registrationTime);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);
    if (diffMinutes < 60) return `${diffMinutes} mins`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Handle starting consultation - marks patient as "In Progress" and removes from queue
  const handleStartConsultation = useCallback(
    async (encounter: EncounterDTO) => {
      try {
        const result = await startConsultation.mutateAsync({
          encounterId: encounter.id,
          doctorId: staff?.id,
        });

        if (result.success) {
          // Successfully marked as in progress - now open the consultation form
          onSelectPatient(encounter);
        } else {
          showToast({
            type: 'error',
            title: 'Cannot Start Consultation',
            message:
              result.error ||
              'This patient may already be in consultation with another doctor.',
          });
        }
      } catch (error: unknown) {
        showToast({
          type: 'error',
          title: 'Error',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to start consultation. Please try again.',
        });
      }
    },
    [startConsultation, staff?.id, onSelectPatient, showToast],
  );

  // Table columns - All doctors in department can see full patient info
  const columns = useMemo(
    () => [
      {
        key: 'patient' as const,
        header: 'Patient',
        render: (encounter: EncounterDTO) => {
          const isEmergency = encounter.priority === 'Emergency';
          const isUrgent = encounter.priority === 'Urgent';

          return (
            <div className="flex items-center gap-3">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                  isEmergency
                    ? 'bg-red-100 text-red-700'
                    : isUrgent
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-600'
                }`}
              >
                {encounter.patient?.first_name?.charAt(0)}
                {encounter.patient?.surname?.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {encounter.patient?.first_name} {encounter.patient?.surname}
                </div>
                <div className="text-sm text-gray-500">
                  {encounter.visit_type}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'priority' as const,
        header: 'Priority',
        render: (encounter: EncounterDTO) => {
          const isEmergency = encounter.priority === 'Emergency';
          const isUrgent = encounter.priority === 'Urgent';
          return (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                isEmergency
                  ? 'bg-red-100 text-red-700'
                  : isUrgent
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-700'
              }`}
            >
              {(isEmergency || isUrgent) && <AlertTriangle size={12} />}
              {encounter.priority}
            </span>
          );
        },
      },
      {
        key: 'wait_time' as const,
        header: 'Wait Time',
        render: (encounter: EncounterDTO) => (
          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={14} />
            <span>{formatWaitTime(encounter.registration_time)}</span>
          </div>
        ),
      },
      {
        key: 'actions' as const,
        header: 'Actions',
        className: 'text-right',
        render: (encounter: EncounterDTO) => {
          const isReadyForConsultation =
            encounter.current_stage === 'consultation';
          const isStarting = startConsultation.isPending;

          // Check if this patient is already being attended by the current doctor
          const isAlreadyAttending =
            encounter.queue_entry?.status === 'In Progress' &&
            encounter.queue_entry?.assigned_to === staff?.id;

          return (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (encounter.patient?.patient_id) {
                    navigate(
                      `/medical-records/${encounter.patient.patient_id}`,
                    );
                  }
                }}
                className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                title="View Medical Records"
              >
                <FileText size={16} />
              </button>
              {isAlreadyAttending ? (
                // Patient already being attended by this doctor - show Continue button
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    // Just open the consultation form - no need to call API again
                    onSelectPatient(encounter);
                  }}
                >
                  <Play size={14} className="mr-1" />
                  Continue
                </Button>
              ) : (
                // New patient - show Start button
                <Button
                  variant={isReadyForConsultation ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    // Start consultation - this marks patient as "In Progress" and removes from queue for other doctors
                    handleStartConsultation(encounter);
                  }}
                  disabled={
                    isStarting ||
                    encounter.current_stage === 'nursing_vitals' ||
                    encounter.current_stage === 'queue_waiting'
                  }
                >
                  {isStarting ? (
                    <Activity size={14} className="mr-1 animate-pulse" />
                  ) : (
                    <Play size={14} className="mr-1" />
                  )}
                  {isReadyForConsultation ? 'Start' : 'View'}
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [
      handleStartConsultation,
      startConsultation.isPending,
      navigate,
      staff?.id,
      onSelectPatient,
    ],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Stethoscope className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Consultation Queue</h3>
            <p className="text-sm text-gray-500">
              {filteredQueue.length} patient
              {filteredQueue.length !== 1 ? 's' : ''} waiting
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient name, EMR..."
              className="w-56 pl-9 pr-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            title="Refresh queue"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Table */}
      {filteredQueue.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title={
            searchQuery.trim() ? 'No matching patients' : 'No patients waiting'
          }
          description={
            searchQuery.trim()
              ? 'Try adjusting your search query'
              : "Patients will appear here when they're ready for consultation"
          }
        />
      ) : (
        <DataTable
          data={filteredQueue}
          columns={columns}
          keyField="visit_id"
          isLoading={isLoading}
          onRowClick={(encounter) => {
            // Check if already attending this patient
            const isAlreadyAttending =
              encounter.queue_entry?.status === 'In Progress' &&
              encounter.queue_entry?.assigned_to === staff?.id;

            if (isAlreadyAttending) {
              // Just open the consultation form
              onSelectPatient(encounter);
            } else {
              // Start consultation - marks patient as "In Progress"
              handleStartConsultation(encounter);
            }
          }}
          rowClassName={(encounter) => {
            // Highlight patients the current doctor is already attending
            const isAlreadyAttending =
              encounter.queue_entry?.status === 'In Progress' &&
              encounter.queue_entry?.assigned_to === staff?.id;
            return isAlreadyAttending
              ? 'hover:bg-teal-50 cursor-pointer bg-teal-50 border-l-4 border-teal-500'
              : 'hover:bg-teal-50 cursor-pointer';
          }}
        />
      )}
    </div>
  );
}
