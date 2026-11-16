import React, { useState } from 'react';
import {
  X,
  User,
  Calendar,
  Activity,
  Stethoscope,
  FlaskConical,
  Scan,
  Pill,
  Heart,
  Thermometer,
  Wind,
  Droplet,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Loader,
} from 'lucide-react';
import { usePatientMedicalHistory } from '../hooks/useConsultation';
import { PatientMedicalHistory } from '../api/consultation.api';
import { SlideOver } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/FormElements';
import { Card, StatusBadge, Tabs } from '../../../components/ui/DataDisplay';
import { SkeletonList } from '../../../components/ui/SkeletonLoader';

// =============================================================================
// Types
// =============================================================================

interface PatientHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | null;
  onStartConsultation?: (patient: PatientMedicalHistory['patient']) => void;
  embedded?: boolean; // When true, renders inline without modal overlay
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateAge(dateOfBirth: string): string {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
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
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusVariant(
  status: string,
): 'success' | 'warning' | 'info' | 'danger' | 'neutral' {
  switch (status) {
    case 'Completed':
    case 'Dispensed':
    case 'Reported':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'In Progress':
    case 'Partial':
      return 'info';
    case 'Cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}

// =============================================================================
// Vitals Card Component
// =============================================================================

interface VitalsCardProps {
  vitals: PatientMedicalHistory['vitals'];
}

function VitalsCard({ vitals }: VitalsCardProps) {
  const latestVitals = vitals[0];

  if (!latestVitals) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
        <Activity size={24} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No vitals recorded</p>
      </div>
    );
  }

  const vs = latestVitals.vital_signs;

  return (
    <div className="space-y-4">
      {/* Latest Vitals Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Last recorded: {formatDateTime(latestVitals.recorded_at)}
        </span>
        <span className="text-xs text-gray-400">
          by {latestVitals.nurse?.first_name} {latestVitals.nurse?.last_name}
        </span>
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-2 gap-3">
        {vs.blood_pressure && (
          <div className="bg-red-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <Heart size={16} />
              <span className="text-xs font-medium">Blood Pressure</span>
            </div>
            <p className="text-lg font-bold text-red-700">
              {vs.blood_pressure.systolic}/{vs.blood_pressure.diastolic}
              <span className="text-sm font-normal ml-1">mmHg</span>
            </p>
          </div>
        )}

        {vs.pulse_rate !== undefined && (
          <div className="bg-pink-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-pink-600 mb-1">
              <Activity size={16} />
              <span className="text-xs font-medium">Pulse Rate</span>
            </div>
            <p className="text-lg font-bold text-pink-700">
              {vs.pulse_rate}
              <span className="text-sm font-normal ml-1">bpm</span>
            </p>
          </div>
        )}

        {vs.temperature !== undefined && (
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <Thermometer size={16} />
              <span className="text-xs font-medium">Temperature</span>
            </div>
            <p className="text-lg font-bold text-orange-700">
              {vs.temperature}
              <span className="text-sm font-normal ml-1">°C</span>
            </p>
          </div>
        )}

        {vs.respiratory_rate !== undefined && (
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Wind size={16} />
              <span className="text-xs font-medium">Respiratory Rate</span>
            </div>
            <p className="text-lg font-bold text-blue-700">
              {vs.respiratory_rate}
              <span className="text-sm font-normal ml-1">/min</span>
            </p>
          </div>
        )}

        {vs.oxygen_saturation !== undefined && (
          <div className="bg-cyan-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-cyan-600 mb-1">
              <Droplet size={16} />
              <span className="text-xs font-medium">SpO₂</span>
            </div>
            <p className="text-lg font-bold text-cyan-700">
              {vs.oxygen_saturation}
              <span className="text-sm font-normal ml-1">%</span>
            </p>
          </div>
        )}

        {(vs.weight !== undefined || vs.height !== undefined) && (
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <TrendingUp size={16} />
              <span className="text-xs font-medium">Weight/Height</span>
            </div>
            <p className="text-lg font-bold text-green-700">
              {vs.weight ? `${vs.weight}kg` : '-'}
              {vs.height ? ` / ${vs.height}cm` : ''}
            </p>
          </div>
        )}
      </div>

      {/* Vitals History (Last 3) */}
      {vitals.length > 1 && (
        <div className="mt-4">
          <h5 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
            Previous Readings
          </h5>
          <div className="space-y-2">
            {vitals.slice(1, 4).map((v) => (
              <div
                key={v.record_id}
                className="flex items-center justify-between text-sm py-2 px-3 bg-gray-50 rounded-lg"
              >
                <span className="text-gray-600">
                  {formatDate(v.recorded_at)}
                </span>
                <div className="flex items-center gap-3 text-gray-700">
                  {v.vital_signs.blood_pressure && (
                    <span className="flex items-center gap-1">
                      <Heart size={12} className="text-red-500" />
                      {v.vital_signs.blood_pressure.systolic}/
                      {v.vital_signs.blood_pressure.diastolic}
                    </span>
                  )}
                  {v.vital_signs.temperature && (
                    <span className="flex items-center gap-1">
                      <Thermometer size={12} className="text-orange-500" />
                      {v.vital_signs.temperature}°C
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Consultation History Component
// =============================================================================

interface ConsultationHistoryProps {
  consultations: PatientMedicalHistory['consultations'];
}

function ConsultationHistory({ consultations }: ConsultationHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (consultations.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
        <FileText size={24} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No consultation history</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {consultations.map((consultation) => {
        const isExpanded = expandedId === consultation.consultation_id;

        return (
          <div
            key={consultation.consultation_id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() =>
                setExpandedId(isExpanded ? null : consultation.consultation_id)
              }
              className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Calendar size={16} className="text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">
                    {formatDate(consultation.consultation_date)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Dr. {consultation.doctor?.last_name || 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {consultation.lab_requests &&
                  consultation.lab_requests.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      <FlaskConical size={10} />
                      {consultation.lab_requests.length}
                    </span>
                  )}
                {consultation.prescriptions &&
                  consultation.prescriptions.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                      <Pill size={10} />
                      {consultation.prescriptions.length}
                    </span>
                  )}
                {isExpanded ? (
                  <ChevronUp size={18} className="text-gray-400" />
                ) : (
                  <ChevronDown size={18} className="text-gray-400" />
                )}
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                {/* Chief Complaints */}
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">
                    Chief Complaints
                  </h5>
                  <p className="text-sm text-gray-900">
                    {consultation.complaints || 'Not recorded'}
                  </p>
                </div>

                {/* Diagnosis */}
                {consultation.diagnosis && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">
                      Diagnosis
                    </h5>
                    <p className="text-sm text-gray-900 font-medium">
                      {consultation.diagnosis}
                    </p>
                  </div>
                )}

                {/* Treatment Plan */}
                {consultation.treatment_plan && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">
                      Treatment Plan
                    </h5>
                    <p className="text-sm text-gray-700">
                      {consultation.treatment_plan}
                    </p>
                  </div>
                )}

                {/* Lab Tests */}
                {consultation.lab_requests &&
                  consultation.lab_requests.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">
                        Lab Tests
                      </h5>
                      <div className="space-y-1">
                        {consultation.lab_requests.map((lr) => (
                          <div
                            key={lr.request_id}
                            className="flex items-center justify-between text-sm py-1.5 px-2 bg-white rounded"
                          >
                            <span className="text-gray-700">
                              {lr.test_name}
                            </span>
                            <StatusBadge
                              status={lr.status}
                              variant={getStatusVariant(lr.status)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Radiology */}
                {consultation.radiology_requests &&
                  consultation.radiology_requests.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">
                        Radiology
                      </h5>
                      <div className="space-y-1">
                        {consultation.radiology_requests.map((rr) => (
                          <div
                            key={rr.request_id}
                            className="flex items-center justify-between text-sm py-1.5 px-2 bg-white rounded"
                          >
                            <span className="text-gray-700">
                              {rr.imaging_name}
                            </span>
                            <StatusBadge
                              status={rr.status}
                              variant={getStatusVariant(rr.status)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Prescriptions */}
                {consultation.prescriptions &&
                  consultation.prescriptions.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">
                        Medications
                      </h5>
                      <div className="space-y-1">
                        {consultation.prescriptions.map((p) => (
                          <div
                            key={p.prescription_id}
                            className="flex items-center justify-between text-sm py-1.5 px-2 bg-white rounded"
                          >
                            <div>
                              <span className="text-gray-700 font-medium">
                                {p.drug_name}
                              </span>
                              <span className="text-gray-500 ml-2">
                                {p.dosage}
                              </span>
                            </div>
                            <StatusBadge
                              status={p.status}
                              variant={getStatusVariant(p.status)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function PatientHistorySidebar({
  isOpen,
  onClose,
  patientId,
  onStartConsultation,
  embedded = false,
}: PatientHistorySidebarProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const {
    data: history,
    isLoading,
    error,
  } = usePatientMedicalHistory(patientId || '');

  const patient = history?.patient;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User size={14} /> },
    { id: 'vitals', label: 'Vitals', icon: <Activity size={14} /> },
    {
      id: 'history',
      label: 'Consultations',
      icon: <Stethoscope size={14} />,
      count: history?.stats.totalConsultations || 0,
    },
  ];

  // Content to render
  const content = (
    <>
      {!patientId ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <User size={32} className="mx-auto mb-3 text-blue-500" />
          <p className="text-blue-700 font-medium">
            Select a patient to view history
          </p>
          <p className="text-sm text-blue-600 mt-1">
            Pick a patient from My Patients or Queue to load full medical
            history.
          </p>
        </div>
      ) : isLoading ? (
        <div className="p-4">
          <SkeletonList count={4} />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-red-500" />
          <p className="text-red-700">Failed to load patient history</p>
        </div>
      ) : !history ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-amber-500" />
          <p className="text-amber-700 font-medium">Patient history not available</p>
          <p className="text-sm text-amber-600 mt-1">
            No patient story was returned for this record. Verify the selected patient and try again.
          </p>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          {/* Patient Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                  {patient?.first_name[0]}
                  {patient?.surname[0]}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {patient?.surname}, {patient?.first_name}{' '}
                    {patient?.middle_name || ''}
                  </h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                    <span>
                      {patient?.gender === 'Male' ? '♂' : '♀'}{' '}
                      {calculateAge(patient?.date_of_birth || '')}
                    </span>
                    {patient?.blood_group && (
                      <span className="flex items-center gap-1">
                        <Droplet size={12} className="text-red-500" />
                        {patient.blood_group}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {patient?.contact_phone && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                        <Phone size={10} />
                        {patient.contact_phone}
                      </span>
                    )}
                    {patient?.email && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                        <Mail size={10} />
                        {patient.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {onStartConsultation && patient && (
                <Button
                  variant="primary"
                  onClick={() => onStartConsultation(patient)}
                >
                  <Stethoscope size={16} className="mr-1" />
                  New Consult
                </Button>
              )}
            </div>

            {/* Allergies Warning */}
            {patient?.allergies && patient.allergies.length > 0 && (
              <div className="mt-3 p-2 bg-red-100 rounded-lg flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600" />
                <span className="text-sm font-medium text-red-700">
                  Allergies: {patient.allergies.join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-blue-600">
                {history.stats.totalConsultations}
              </p>
              <p className="text-xs text-blue-600/70">Consultations</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-green-600">
                {history.stats.totalLabTests}
              </p>
              <p className="text-xs text-green-600/70">Lab Tests</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-purple-600">
                {history.stats.totalRadiology}
              </p>
              <p className="text-xs text-purple-600/70">Imaging</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-orange-600">
                {history.stats.totalPrescriptions}
              </p>
              <p className="text-xs text-orange-600/70">Prescriptions</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto mt-4">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Latest Vitals Summary */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Activity size={18} className="text-blue-600" />
                    Latest Vitals
                  </h4>
                  <VitalsCard vitals={history.vitals.slice(0, 1)} />
                </div>

                {/* Recent Consultations */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Stethoscope size={18} className="text-green-600" />
                    Recent Consultations
                  </h4>
                  <ConsultationHistory
                    consultations={history.consultations.slice(0, 3)}
                  />
                </div>
              </div>
            )}

            {activeTab === 'vitals' && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Vitals History
                </h4>
                <VitalsCard vitals={history.vitals} />
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  All Consultations ({history.consultations.length})
                </h4>
                <ConsultationHistory consultations={history.consultations} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  // If embedded mode, render content directly without modal
  if (embedded) {
    return <div className="h-full overflow-y-auto">{content}</div>;
  }

  // Otherwise, wrap in SlideOver modal
  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Patient Medical History"
      size="xl"
    >
      {content}
    </SlideOver>
  );
}
