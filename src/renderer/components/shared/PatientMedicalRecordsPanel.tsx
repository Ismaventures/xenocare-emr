/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - PATIENT MEDICAL RECORDS PANEL
 * Reusable component for viewing comprehensive patient medical records
 * Following global EMR best practices for encounter-centric documentation
 * =============================================================================
 */

import React, { useState } from 'react';
import {
  User,
  Activity,
  Stethoscope,
  FlaskConical,
  Scan,
  Pill,
  Heart,
  Thermometer,
  Wind,
  Droplet,
  Clock,
  FileText,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ClipboardList,
  Eye,
  Loader2,
  ArrowUpRight,
  History,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { usePatientMedicalHistory } from '../../modules/clinical-consultation/hooks/useConsultation';
import {
  usePatientEncounters,
  useEncounterDetails,
} from '../../modules/clinical-consultation/hooks/useMedicalRecords';
import { Button } from '../ui/FormElements';
import { Tabs } from '../ui/DataDisplay';

// =============================================================================
// Types
// =============================================================================

interface PatientMedicalRecordsPanelProps {
  patientId: string;
  encounterId?: string;
  showHeader?: boolean;
  defaultTab?:
    | 'overview'
    | 'vitals'
    | 'encounters'
    | 'labs'
    | 'imaging'
    | 'prescriptions';
  maxHeight?: string;
  onEncounterClick?: (encounterId: string) => void;
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
  try {
    return format(new Date(dateString), 'dd MMM yyyy');
  } catch {
    return dateString;
  }
}

function formatDateTime(dateString: string): string {
  try {
    return format(new Date(dateString), 'dd MMM yyyy, HH:mm');
  } catch {
    return dateString;
  }
}

// =============================================================================
// Vitals Component
// =============================================================================

interface VitalItemProps {
  label: string;
  value: string | number | undefined;
  unit: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  isAbnormal?: boolean;
}

function VitalItem({
  label,
  value,
  unit,
  icon,
  trend,
  isAbnormal,
}: VitalItemProps) {
  if (value === undefined || value === null) return null;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg ${isAbnormal ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}
    >
      <div
        className={`p-2 rounded-lg ${isAbnormal ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="flex items-center gap-2">
          <span
            className={`font-semibold ${isAbnormal ? 'text-red-700' : 'text-gray-900'}`}
          >
            {value}{' '}
            <span className="text-sm font-normal text-gray-500">{unit}</span>
          </span>
          {trend && (
            <span
              className={`${trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-gray-400'}`}
            >
              {trend === 'up' ? (
                <TrendingUp size={14} />
              ) : trend === 'down' ? (
                <TrendingDown size={14} />
              ) : (
                <Minus size={14} />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Encounter Summary Card
// =============================================================================

interface EncounterCardProps {
  encounter: {
    id: string;
    encounter_number?: string;
    visit_type?: string;
    chief_complaint?: string;
    diagnosis?: string;
    created_at: string;
    doctor_name?: string;
  };
  onClick?: (encounterId: string) => void;
  isExpanded?: boolean;
}

function EncounterCard({ encounter, onClick, isExpanded }: EncounterCardProps) {
  const [expanded, setExpanded] = useState(isExpanded || false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
      <div
        className="p-4 bg-gray-50 cursor-pointer flex items-center justify-between hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Stethoscope size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {encounter.encounter_number ||
                  (encounter.id
                    ? `ENC-${encounter.id.slice(0, 8)}`
                    : 'Consultation')}
              </span>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {encounter.visit_type || 'OPD'}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {formatDateTime(encounter.created_at)}
              {encounter.doctor_name && ` • Dr. ${encounter.doctor_name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClick(encounter.id);
              }}
            >
              <ArrowUpRight size={14} />
            </Button>
          )}
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-t border-gray-200 space-y-3">
          {encounter.chief_complaint && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Chief Complaint
              </p>
              <p className="text-sm text-gray-900">
                {encounter.chief_complaint}
              </p>
            </div>
          )}
          {encounter.diagnosis && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Diagnosis
              </p>
              <p className="text-sm text-gray-900">{encounter.diagnosis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Lab Result Card
// =============================================================================

interface LabResultCardProps {
  lab: {
    id: string;
    test_name: string;
    status: string;
    result_value?: string | number;
    result_unit?: string;
    reference_range?: string;
    is_abnormal?: boolean;
    requested_at: string;
  };
}

function LabResultCard({ lab }: LabResultCardProps) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    Completed: { bg: 'bg-green-100', text: 'text-green-800' },
    Pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    Processing: { bg: 'bg-blue-100', text: 'text-blue-800' },
    Cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
  };

  const status = statusColors[lab.status] || statusColors.Pending;

  return (
    <div
      className={`p-3 rounded-lg border ${lab.is_abnormal ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-900 text-sm">
          {lab.test_name}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}
        >
          {lab.status}
        </span>
      </div>
      {lab.result_value && (
        <div className="flex items-center justify-between text-sm">
          <span
            className={
              lab.is_abnormal ? 'text-red-700 font-semibold' : 'text-gray-700'
            }
          >
            {lab.result_value} {lab.result_unit}
          </span>
          {lab.reference_range && (
            <span className="text-xs text-gray-500">
              Ref: {lab.reference_range}
            </span>
          )}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-1">
        {formatDistanceToNow(new Date(lab.requested_at), { addSuffix: true })}
      </p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function PatientMedicalRecordsPanel({
  patientId,
  encounterId,
  showHeader = true,
  defaultTab = 'overview',
  maxHeight = '600px',
  onEncounterClick,
}: PatientMedicalRecordsPanelProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(
    encounterId || null,
  );

  // Guard against empty patientId
  const validPatientId = patientId && patientId.trim() !== '';

  // Fetch patient medical history - only if patientId is valid
  const {
    data: history,
    isLoading,
    error,
  } = usePatientMedicalHistory(validPatientId ? patientId : '');

  // Fetch patient encounters
  const { data: encountersData, isLoading: encountersLoading } =
    usePatientEncounters(validPatientId ? patientId : null, 1, 20);

  // Fetch specific encounter details if selected
  const { data: encounterDetails, isLoading: encounterDetailsLoading } =
    useEncounterDetails(selectedEncounterId);

  const patient = history?.patient;

  // Early return if no valid patientId
  if (!validPatientId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 text-yellow-500" />
        <p className="text-yellow-700">No patient selected</p>
        <p className="text-sm text-yellow-500 mt-1">
          Please select a patient to view their medical records
        </p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User size={14} /> },
    {
      id: 'vitals',
      label: 'Vitals',
      icon: <Activity size={14} />,
      count: history?.vitals?.length || 0,
    },
    {
      id: 'encounters',
      label: 'Encounters',
      icon: <Stethoscope size={14} />,
      count: history?.stats?.totalConsultations || 0,
    },
    {
      id: 'labs',
      label: 'Labs',
      icon: <FlaskConical size={14} />,
      count: history?.stats?.totalLabTests || 0,
    },
    {
      id: 'imaging',
      label: 'Imaging',
      icon: <Scan size={14} />,
      count: history?.stats?.totalRadiology || 0,
    },
    {
      id: 'prescriptions',
      label: 'Rx',
      icon: <Pill size={14} />,
      count: history?.stats?.totalPrescriptions || 0,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        <span className="ml-2 text-gray-500">Loading patient records...</span>
      </div>
    );
  }

  if (error) {
    // Safely extract error message
    let errorMessage = 'Please try again or contact support';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }
    console.error('PatientMedicalRecordsPanel error:', {
      error,
      patientId,
      errorMessage,
    });
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 text-red-500" />
        <p className="text-red-700">Failed to load patient records</p>
        <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
        <p className="text-xs text-gray-400 mt-2">Patient ID: {patientId}</p>
      </div>
    );
  }

  if (!history) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 text-amber-500" />
        <p className="text-amber-700 font-medium">Patient story could not be loaded</p>
        <p className="text-sm text-amber-600 mt-1">
          No medical history record was returned for this patient. Check the patient linkage or refresh the form.
        </p>
        <p className="text-xs text-amber-500 mt-2">Patient ID: {patientId}</p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-200"
      style={{ maxHeight }}
    >
      {/* Patient Header */}
      {showHeader && patient && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
              {patient.first_name?.[0]}
              {patient.surname?.[0]}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">
                {patient.surname}, {patient.first_name}{' '}
                {patient.middle_name || ''}
              </h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <User size={14} />
                  {patient.gender === 'Male' ? '♂' : '♀'}{' '}
                  {calculateAge(patient.date_of_birth || '')}
                </span>
                <span className="font-mono text-blue-600">
                  {patient.patient_id}
                </span>
                {patient.blood_group && (
                  <span className="flex items-center gap-1">
                    <Droplet size={14} className="text-red-500" />
                    {patient.blood_group}
                  </span>
                )}
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-3 mt-2">
                {patient.contact_phone && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                    <Phone size={10} />
                    {patient.contact_phone}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hidden md:flex gap-2">
              <div className="bg-white/70 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-blue-600">
                  {history.stats?.totalConsultations || 0}
                </p>
                <p className="text-xs text-gray-500">Visits</p>
              </div>
              <div className="bg-white/70 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-green-600">
                  {history.stats?.totalLabTests || 0}
                </p>
                <p className="text-xs text-gray-500">Labs</p>
              </div>
              <div className="bg-white/70 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-purple-600">
                  {history.stats?.totalPrescriptions || 0}
                </p>
                <p className="text-xs text-gray-500">Rx</p>
              </div>
            </div>
          </div>

          {/* Allergies Warning */}
          {patient.allergies && patient.allergies.length > 0 && (
            <div className="mt-3 p-2 bg-red-100 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
              <span className="text-sm font-medium text-red-700">
                <strong>Allergies:</strong> {patient.allergies.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 pt-3 border-b border-gray-200">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      <div
        className="p-4 overflow-y-auto"
        style={{
          maxHeight: showHeader ? 'calc(100% - 200px)' : 'calc(100% - 60px)',
        }}
      >
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Latest Vitals */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Activity size={18} className="text-blue-600" />
                Latest Vitals
              </h4>
              {history.vitals?.[0] ? (
                (() => {
                  const vs = history.vitals[0].vital_signs;
                  const bpSystolic = vs?.blood_pressure
                    ? typeof vs.blood_pressure === 'object'
                      ? vs.blood_pressure.systolic
                      : parseInt(vs.blood_pressure.split('/')[0])
                    : null;
                  const bpDiastolic = vs?.blood_pressure
                    ? typeof vs.blood_pressure === 'object'
                      ? vs.blood_pressure.diastolic
                      : parseInt(vs.blood_pressure.split('/')[1])
                    : null;
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <VitalItem
                        label="Blood Pressure"
                        value={
                          bpSystolic && bpDiastolic
                            ? `${bpSystolic}/${bpDiastolic}`
                            : undefined
                        }
                        unit="mmHg"
                        icon={<Heart size={18} />}
                        isAbnormal={
                          bpSystolic
                            ? bpSystolic > 140 || bpSystolic < 90
                            : false
                        }
                      />
                      <VitalItem
                        label="Pulse Rate"
                        value={vs?.pulse_rate}
                        unit="bpm"
                        icon={<Activity size={18} />}
                        isAbnormal={
                          vs?.pulse_rate
                            ? vs.pulse_rate > 100 || vs.pulse_rate < 60
                            : false
                        }
                      />
                      <VitalItem
                        label="Temperature"
                        value={vs?.temperature}
                        unit="°C"
                        icon={<Thermometer size={18} />}
                        isAbnormal={
                          vs?.temperature
                            ? vs.temperature > 37.5 || vs.temperature < 36
                            : false
                        }
                      />
                      <VitalItem
                        label="SpO₂"
                        value={vs?.oxygen_saturation}
                        unit="%"
                        icon={<Wind size={18} />}
                        isAbnormal={
                          vs?.oxygen_saturation
                            ? vs.oxygen_saturation < 95
                            : false
                        }
                      />
                    </div>
                  );
                })()
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                  <Activity size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No vitals recorded</p>
                </div>
              )}
            </div>

            {/* Recent Consultations */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Stethoscope size={18} className="text-green-600" />
                Recent Consultations
              </h4>
              {history.consultations
                ?.slice(0, 3)
                .map((consult: any, index: number) => (
                  <EncounterCard
                    key={consult.consultation_id || index}
                    encounter={{
                      id: consult.consultation_id || '',
                      encounter_number: consult.consultation_id,
                      visit_type: 'Consultation',
                      chief_complaint: consult.complaints,
                      diagnosis: consult.diagnosis,
                      created_at: consult.consultation_date,
                      doctor_name: consult.doctor
                        ? `${consult.doctor.first_name} ${consult.doctor.last_name}`
                        : undefined,
                    }}
                    onClick={onEncounterClick}
                  />
                ))}
              {(!history.consultations ||
                history.consultations.length === 0) && (
                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                  <Stethoscope size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No previous consultations</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vitals Tab */}
        {activeTab === 'vitals' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <History size={18} className="text-blue-600" />
              Vitals History
            </h4>
            {history.vitals?.map((vital, index: number) => {
              const vs = vital.vital_signs;
              return (
                <div
                  key={vital.record_id || index}
                  className="bg-gray-50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      {formatDateTime(vital.recorded_at)}
                    </span>
                    {vital.nurse && (
                      <span className="text-xs text-gray-500">
                        By: {vital.nurse.first_name} {vital.nurse.last_name}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {vs?.blood_pressure && (
                      <div className="text-sm">
                        <span className="text-gray-500">BP:</span>{' '}
                        <span className="font-medium">
                          {typeof vs.blood_pressure === 'object'
                            ? `${vs.blood_pressure.systolic}/${vs.blood_pressure.diastolic}`
                            : vs.blood_pressure}{' '}
                          mmHg
                        </span>
                      </div>
                    )}
                    {vs?.pulse_rate && (
                      <div className="text-sm">
                        <span className="text-gray-500">Pulse:</span>{' '}
                        <span className="font-medium">{vs.pulse_rate} bpm</span>
                      </div>
                    )}
                    {vs?.temperature && (
                      <div className="text-sm">
                        <span className="text-gray-500">Temp:</span>{' '}
                        <span className="font-medium">{vs.temperature}°C</span>
                      </div>
                    )}
                    {vs?.oxygen_saturation && (
                      <div className="text-sm">
                        <span className="text-gray-500">SpO₂:</span>{' '}
                        <span className="font-medium">
                          {vs.oxygen_saturation}%
                        </span>
                      </div>
                    )}
                    {vs?.respiratory_rate && (
                      <div className="text-sm">
                        <span className="text-gray-500">RR:</span>{' '}
                        <span className="font-medium">
                          {vs.respiratory_rate}/min
                        </span>
                      </div>
                    )}
                    {vs?.weight && (
                      <div className="text-sm">
                        <span className="text-gray-500">Weight:</span>{' '}
                        <span className="font-medium">{vs.weight} kg</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {(!history.vitals || history.vitals.length === 0) && (
              <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                <Activity size={32} className="mx-auto mb-2 opacity-50" />
                <p>No vitals history available</p>
              </div>
            )}
          </div>
        )}

        {/* Encounters Tab */}
        {activeTab === 'encounters' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList size={18} className="text-green-600" />
              All Encounters ({history.consultations?.length || 0})
            </h4>
            {history.consultations?.map((consult: any, index: number) => (
              <EncounterCard
                key={consult.consultation_id || index}
                encounter={{
                  id: consult.consultation_id || '',
                  encounter_number: consult.consultation_id,
                  visit_type: 'Consultation',
                  chief_complaint: consult.complaints,
                  diagnosis: consult.diagnosis,
                  created_at: consult.consultation_date,
                  doctor_name: consult.doctor
                    ? `${consult.doctor.first_name} ${consult.doctor.last_name}`
                    : undefined,
                }}
                onClick={onEncounterClick}
              />
            ))}
            {(!history.consultations || history.consultations.length === 0) && (
              <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                <Stethoscope size={32} className="mx-auto mb-2 opacity-50" />
                <p>No encounters found</p>
              </div>
            )}
          </div>
        )}

        {/* Labs Tab */}
        {activeTab === 'labs' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <FlaskConical size={18} className="text-purple-600" />
              Laboratory Results
            </h4>
            {(() => {
              const consultationLabs =
                history.consultations?.flatMap((consult) =>
                  (consult.lab_requests || []).map((lab) => ({
                    ...lab,
                    requested_at: consult.consultation_date,
                  })),
                ) || [];

              const standaloneLabs = (history.lab_requests || []).map(
                (lab) => ({
                  ...lab,
                  requested_at: lab.requested_at || undefined,
                }),
              );

              // Deduplicate in case of overlap and keep newest-first ordering.
              const labMap = new Map<string, any>();
              [...consultationLabs, ...standaloneLabs].forEach((lab) => {
                if (!lab?.request_id) return;
                if (!labMap.has(lab.request_id)) {
                  labMap.set(lab.request_id, lab);
                }
              });

              const allLabs = Array.from(labMap.values()).sort((a, b) => {
                const aTime = a.requested_at
                  ? new Date(a.requested_at).getTime()
                  : 0;
                const bTime = b.requested_at
                  ? new Date(b.requested_at).getTime()
                  : 0;
                return bTime - aTime;
              });

              if (allLabs.length === 0) {
                return (
                  <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                    <FlaskConical
                      size={32}
                      className="mx-auto mb-2 opacity-50"
                    />
                    <p>No lab results available</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {allLabs.map((lab) => (
                    <div
                      key={lab.request_id}
                      className={`p-3 rounded-lg border ${
                        lab.is_critical
                          ? 'border-red-300 bg-red-50'
                          : lab.is_abnormal
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {lab.test_name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {lab.is_critical && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-600 text-white font-semibold">
                              CRITICAL
                            </span>
                          )}
                          {lab.is_abnormal && !lab.is_critical && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-semibold">
                              ABNORMAL
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              lab.status === 'Completed'
                                ? 'bg-green-100 text-green-800'
                                : lab.status === 'Pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {lab.status}
                          </span>
                        </div>
                      </div>

                      {/* Rich result display */}
                      {(lab.result_value || lab.result) && (
                        <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-100">
                          {lab.result_value ? (
                            <div className="flex items-baseline justify-between">
                              <span
                                className={`text-sm font-semibold ${
                                  lab.is_critical
                                    ? 'text-red-700'
                                    : lab.is_abnormal
                                      ? 'text-amber-700'
                                      : 'text-gray-900'
                                }`}
                              >
                                {lab.result_value}
                                {lab.result_unit && (
                                  <span className="text-xs text-gray-500 font-normal ml-1">
                                    {lab.result_unit}
                                  </span>
                                )}
                              </span>
                              {lab.reference_range && (
                                <span className="text-xs text-gray-500">
                                  Ref: {lab.reference_range}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {lab.result}
                            </p>
                          )}
                        </div>
                      )}

                      {lab.interpretation && (
                        <p className="text-xs text-gray-600 mt-1 italic">
                          {lab.interpretation}
                        </p>
                      )}

                      <p className="text-xs text-gray-400 mt-1">
                        {lab.requested_at
                          ? formatDate(lab.requested_at)
                          : 'Unknown date'}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Imaging Tab */}
        {activeTab === 'imaging' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Scan size={18} className="text-indigo-600" />
              Imaging Studies
            </h4>
            {(() => {
              // Extract all radiology requests from consultations
              const allImaging =
                history.consultations?.flatMap((consult) =>
                  (consult.radiology_requests || []).map((imaging) => ({
                    ...imaging,
                    consultation_date: consult.consultation_date,
                  })),
                ) || [];

              if (allImaging.length === 0) {
                return (
                  <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                    <Scan size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No imaging studies available</p>
                  </div>
                );
              }

              const statusColor = (s: string) => {
                if (
                  s === 'Final Report' ||
                  s === 'Reported' ||
                  s === 'Completed'
                )
                  return 'bg-green-100 text-green-800';
                if (s === 'Preliminary Report')
                  return 'bg-blue-100 text-blue-800';
                if (s === 'Awaiting Report')
                  return 'bg-orange-100 text-orange-800';
                return 'bg-yellow-100 text-yellow-800';
              };

              return (
                <div className="space-y-3">
                  {allImaging.map((imaging) => (
                    <div
                      key={imaging.request_id}
                      className="rounded-lg border border-gray-200 bg-white overflow-hidden"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <Scan size={14} className="text-indigo-500" />
                          <span className="font-medium text-gray-900 text-sm">
                            {imaging.imaging_name}
                          </span>
                          {imaging.body_part && (
                            <span className="text-xs text-gray-500">
                              — {imaging.body_part}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {imaging.modality && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">
                              {imaging.modality}
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${statusColor(imaging.status)}`}
                          >
                            {imaging.status}
                          </span>
                        </div>
                      </div>

                      {/* Report content */}
                      <div className="p-3 space-y-2">
                        {imaging.findings && (
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                              Findings
                            </p>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                              {imaging.findings}
                            </p>
                          </div>
                        )}
                        {imaging.impression && (
                          <div className="bg-blue-50 border border-blue-100 rounded p-2">
                            <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-0.5">
                              Impression
                            </p>
                            <p className="text-sm text-blue-900 font-medium whitespace-pre-wrap leading-relaxed">
                              {imaging.impression}
                            </p>
                          </div>
                        )}
                        {!imaging.findings &&
                          !imaging.impression &&
                          imaging.report && (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {imaging.report}
                            </p>
                          )}
                        {!imaging.findings &&
                          !imaging.impression &&
                          !imaging.report && (
                            <p className="text-sm text-gray-400 italic">
                              Report pending
                            </p>
                          )}
                        <p className="text-xs text-gray-400">
                          {formatDate(imaging.consultation_date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Pill size={18} className="text-orange-600" />
              Prescription History
            </h4>
            {(() => {
              // Extract all prescriptions from consultations
              const allPrescriptions =
                history.consultations?.flatMap((consult) =>
                  (consult.prescriptions || []).map((rx) => ({
                    ...rx,
                    consultation_date: consult.consultation_date,
                  })),
                ) || [];

              if (allPrescriptions.length === 0) {
                return (
                  <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                    <Pill size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No prescription history available</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {allPrescriptions.map((rx) => (
                    <div
                      key={rx.prescription_id}
                      className="bg-gray-50 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {rx.drug_name}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            rx.status === 'Dispensed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {rx.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>Dosage: {rx.dosage}</div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Prescribed: {formatDate(rx.consultation_date)}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
