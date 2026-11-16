import React, { useEffect, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  Stethoscope,
  FlaskConical,
  Scan,
  Pill,
  Activity,
  Clock,
  Printer,
  Edit,
  AlertCircle,
  Save,
} from 'lucide-react';
import { SlideOver } from '../../../components/ui/Modal';
import { Button, Card, StatusBadge, Tabs } from '../../../components/ui';
import {
  ConsultationWithDetails,
  UpdateConsultationDTO,
  CONSULTATION_EDIT_REASONS,
  getConsultationStatusColor,
  isWithinEditWindow,
  getEditWindowRemaining,
  getEditWindowExpiry,
} from '../dtos/consultation.dto';
import {
  formatPatientName,
  formatDetailedAge,
} from '../../patient-registration/dtos/patient.dto';
import PatientVitalsSummary from './PatientVitalsSummary';
import { useAuth } from '../../../contexts/AuthContext';

// =============================================================================
// Types
// =============================================================================

interface ConsultationDetailProps {
  isOpen: boolean;
  onClose: () => void;
  consultation: ConsultationWithDetails | null;
  onEdit?: () => void;
  onSaveEdit?: (payload: UpdateConsultationDTO) => Promise<void>;
  isSavingEdit?: boolean;
  onPrint?: () => void;
}

type EditableConsultationFields = {
  complaints: string;
  history_of_present_illness: string;
  past_medical_history: string;
  examination_findings: string;
  diagnosis: string;
  treatment_plan: string;
  clinical_notes: string;
  follow_up_notes: string;
  follow_up_date: string;
};

const buildEditState = (
  consultation: ConsultationWithDetails,
): EditableConsultationFields => ({
  complaints: consultation.complaints || '',
  history_of_present_illness: consultation.history_of_present_illness || '',
  past_medical_history: consultation.past_medical_history || '',
  examination_findings: consultation.examination_findings || '',
  diagnosis: Array.isArray(consultation.diagnosis)
    ? consultation.diagnosis.join('; ')
    : consultation.diagnosis || '',
  treatment_plan: consultation.treatment_plan || '',
  clinical_notes: consultation.clinical_notes || '',
  follow_up_notes: consultation.follow_up_notes || '',
  follow_up_date: consultation.follow_up_date
    ? consultation.follow_up_date.split('T')[0]
    : '',
});

// =============================================================================
// Sub-components
// =============================================================================

function DetailSection({
  title,
  children,
  icon: Icon,
}: {
  title: string;
  children: React.ReactNode;
  icon: React.ElementType;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className="text-gray-500" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="mb-3">
      <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </dt>
      <dd className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
        {value}
      </dd>
    </div>
  );
}

function OrderCard({
  orderKey,
  title,
  status,
  details,
  statusColor,
  isExpanded,
  onToggle,
}: {
  orderKey: string;
  title: string;
  status: string;
  details?: unknown;
  statusColor: 'info' | 'warning' | 'success' | 'danger' | 'neutral';
  isExpanded: boolean;
  onToggle: (key: string) => void;
}) {
  const formattedDetails = formatOrderDetails(details);
  const hasDetails = Boolean(formattedDetails);

  return (
    <button
      type="button"
      onClick={() => hasDetails && onToggle(orderKey)}
      className="w-full p-3 bg-gray-50 rounded-lg border border-gray-100 text-left"
    >
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="font-medium text-gray-900">{title}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} variant={statusColor} />
          {hasDetails &&
            (isExpanded ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            ))}
        </div>
      </div>
      {hasDetails && isExpanded ? (
        <pre className="text-sm text-gray-500 whitespace-pre-wrap leading-relaxed font-sans mt-2">
          {formattedDetails}
        </pre>
      ) : hasDetails ? (
        <p className="text-xs text-gray-400 mt-2">Click to view details</p>
      ) : null}
    </button>
  );
}

function formatOrderDetails(details?: unknown): string | null {
  if (details == null) return null;
  if (typeof details === 'string') {
    return details.trim() ? details : null;
  }
  if (typeof details === 'number' || typeof details === 'boolean') {
    return String(details);
  }
  if (typeof details === 'object') {
    try {
      const formatted = JSON.stringify(details, null, 2);
      return formatted === '{}' ? null : formatted;
    } catch {
      return null;
    }
  }
  return null;
}

// =============================================================================
// Main Component
// =============================================================================

export default function ConsultationDetail({
  isOpen,
  onClose,
  consultation,
  onEdit,
  onSaveEdit,
  isSavingEdit,
  onPrint,
}: ConsultationDetailProps) {
  const [activeTab, setActiveTab] = React.useState('notes');
  const [isEditingRecord, setIsEditingRecord] = useState(false);
  const [editForm, setEditForm] = useState<EditableConsultationFields | null>(
    null,
  );
  const [editReason, setEditReason] = useState('');
  const [editReasonDetails, setEditReasonDetails] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<
    Record<string, boolean>
  >({});
  const { staff } = useAuth();

  useEffect(() => {
    if (!consultation) return;
    setEditForm(buildEditState(consultation));
    setEditReason('');
    setEditReasonDetails('');
    setEditError(null);
    setIsEditingRecord(false);
    setExpandedOrderIds({});
  }, [consultation?.consultation_id]);

  if (!consultation) return null;

  const { patient } = consultation;
  const { doctor } = consultation;

  // 15-minute edit window check for doctors
  const isDoctor =
    staff?.role === 'doctor' ||
    staff?.role === 'medical_director' ||
    staff?.role === 'super_admin';
  const canEditWithinWindow =
    isDoctor && isWithinEditWindow(consultation.created_at);
  const editTimeRemaining = canEditWithinWindow
    ? getEditWindowRemaining(consultation.created_at)
    : null;
  const editWindowExpiry = getEditWindowExpiry(consultation.created_at);
  const canInlineEdit = Boolean(onSaveEdit) && canEditWithinWindow;

  const handleEditFieldChange = (
    field: keyof EditableConsultationFields,
    value: string,
  ) => {
    setEditForm((prev) => ({
      ...(prev || buildEditState(consultation)),
      [field]: value,
    }));
  };

  const handleBeginEdit = () => {
    setEditForm(buildEditState(consultation));
    setEditReason('');
    setEditReasonDetails('');
    setEditError(null);
    setIsEditingRecord(true);
  };

  const handleCancelEdit = () => {
    setEditForm(buildEditState(consultation));
    setEditReason('');
    setEditReasonDetails('');
    setEditError(null);
    setIsEditingRecord(false);
  };

  const handleSaveEdit = async () => {
    if (!onSaveEdit || !editForm) return;

    if (!editReason) {
      setEditError('Please select a reason for this consultation edit.');
      return;
    }

    try {
      setEditError(null);
      await onSaveEdit({
        consultation_id: consultation.consultation_id,
        complaints: editForm.complaints,
        history_of_present_illness: editForm.history_of_present_illness,
        past_medical_history: editForm.past_medical_history,
        examination_findings: editForm.examination_findings,
        diagnosis: editForm.diagnosis,
        treatment_plan: editForm.treatment_plan,
        clinical_notes: editForm.clinical_notes,
        follow_up_notes: editForm.follow_up_notes,
        follow_up_date: editForm.follow_up_date || undefined,
        edit_reason: editReason as UpdateConsultationDTO['edit_reason'],
        edit_reason_details: editReasonDetails || undefined,
      });
      setIsEditingRecord(false);
    } catch (error: any) {
      setEditError(error?.message || 'Unable to save consultation changes.');
    }
  };

  const tabs = [
    { id: 'notes', label: 'Clinical Notes', icon: <FileText size={16} /> },
    {
      id: 'lab',
      label: 'Lab Tests',
      icon: <FlaskConical size={16} />,
      count: consultation.lab_requests?.length || 0,
    },
    {
      id: 'radiology',
      label: 'Radiology',
      icon: <Scan size={16} />,
      count: consultation.radiology_requests?.length || 0,
    },
    {
      id: 'procedures',
      label: 'Procedures',
      icon: <Activity size={16} />,
      count: consultation.procedure_requests?.length || 0,
    },
    {
      id: 'prescriptions',
      label: 'Prescriptions',
      icon: <Pill size={16} />,
      count: consultation.prescriptions?.length || 0,
    },
  ];

  const getLabStatusColor = (
    status: string,
  ): 'info' | 'warning' | 'success' | 'danger' | 'neutral' => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'info';
      case 'Pending':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const getRadiologyStatusColor = (
    status: string,
  ): 'info' | 'warning' | 'success' | 'danger' | 'neutral' => {
    switch (status) {
      case 'Reported':
        return 'success';
      case 'Completed':
        return 'info';
      case 'In Progress':
        return 'warning';
      case 'Pending':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const getProcedureStatusColor = (
    status: string,
  ): 'info' | 'warning' | 'success' | 'danger' | 'neutral' => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'info';
      case 'Pending':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const getPrescriptionStatusColor = (
    status: string,
  ): 'info' | 'warning' | 'success' | 'danger' | 'neutral' => {
    switch (status) {
      case 'Dispensed':
        return 'success';
      case 'Partial':
        return 'info';
      case 'Pending':
        return 'warning';
      case 'Cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const toggleOrderDetails = (key: string) => {
    setExpandedOrderIds((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Consultation Details"
      size="xl"
    >
      <div className="h-full flex flex-col">
        {/* Patient Header */}
        <Card className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
                {patient?.first_name?.charAt(0)}
                {patient?.surname?.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {patient ? formatPatientName(patient) : 'Unknown Patient'}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{patient?.gender}</span>
                  <span>•</span>
                  <span>
                    {patient ? formatDetailedAge(patient.date_of_birth) : '-'}
                  </span>
                  {patient?.blood_group && (
                    <>
                      <span>•</span>
                      <span className="text-red-600 font-medium">
                        {patient.blood_group}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <StatusBadge
              status={consultation.status}
              variant={getConsultationStatusColor(consultation.status)}
            />
          </div>
        </Card>

        <PatientVitalsSummary
          patientId={consultation.patient_id}
          className="mb-4"
        />

        {/* Meta Info */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-gray-600">
              {new Date(consultation.consultation_date).toLocaleDateString(
                'en-GB',
                {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                },
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User size={16} className="text-gray-400" />
            <span className="text-gray-600">
              Dr. {doctor?.first_name} {doctor?.last_name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock size={16} className="text-gray-400" />
            <span className="text-gray-600">
              {new Date(consultation.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {activeTab === 'notes' && (
            <div>
              {(consultation.is_altered ||
                consultation.alteration_reason_label ||
                consultation.alteration_reason_details) && (
                <Card className="mb-4 border-amber-200 bg-amber-50">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-amber-700 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Altered Record
                      </p>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Reason:{' '}
                        {consultation.alteration_reason_label ||
                          'Other clinical correction'}
                        {consultation.alteration_reason_details
                          ? ` - ${consultation.alteration_reason_details}`
                          : ''}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {isEditingRecord && editForm && (
                <Card className="mb-5 border-blue-200 bg-blue-50/50">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-blue-900">
                      Edit Consultation (Reason Required)
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Edit Reason *
                      </label>
                      <select
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                      >
                        <option value="">Select a reason</option>
                        {CONSULTATION_EDIT_REASONS.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Additional Reason Details
                      </label>
                      <textarea
                        value={editReasonDetails}
                        onChange={(e) => setEditReasonDetails(e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Optional details about what changed"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Chief Complaints
                        </label>
                        <textarea
                          value={editForm.complaints}
                          onChange={(e) =>
                            handleEditFieldChange('complaints', e.target.value)
                          }
                          rows={2}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Diagnosis
                        </label>
                        <textarea
                          value={editForm.diagnosis}
                          onChange={(e) =>
                            handleEditFieldChange('diagnosis', e.target.value)
                          }
                          rows={2}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          History of Present Illness
                        </label>
                        <textarea
                          value={editForm.history_of_present_illness}
                          onChange={(e) =>
                            handleEditFieldChange(
                              'history_of_present_illness',
                              e.target.value,
                            )
                          }
                          rows={3}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Examination Findings
                        </label>
                        <textarea
                          value={editForm.examination_findings}
                          onChange={(e) =>
                            handleEditFieldChange(
                              'examination_findings',
                              e.target.value,
                            )
                          }
                          rows={3}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Past Medical History
                        </label>
                        <textarea
                          value={editForm.past_medical_history}
                          onChange={(e) =>
                            handleEditFieldChange(
                              'past_medical_history',
                              e.target.value,
                            )
                          }
                          rows={3}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Treatment Plan
                        </label>
                        <textarea
                          value={editForm.treatment_plan}
                          onChange={(e) =>
                            handleEditFieldChange(
                              'treatment_plan',
                              e.target.value,
                            )
                          }
                          rows={3}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Clinical Notes
                        </label>
                        <textarea
                          value={editForm.clinical_notes}
                          onChange={(e) =>
                            handleEditFieldChange(
                              'clinical_notes',
                              e.target.value,
                            )
                          }
                          rows={2}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Follow-up Notes
                        </label>
                        <textarea
                          value={editForm.follow_up_notes}
                          onChange={(e) =>
                            handleEditFieldChange(
                              'follow_up_notes',
                              e.target.value,
                            )
                          }
                          rows={2}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Follow-up Date
                      </label>
                      <input
                        type="date"
                        value={editForm.follow_up_date}
                        onChange={(e) =>
                          handleEditFieldChange(
                            'follow_up_date',
                            e.target.value,
                          )
                        }
                        className="w-full md:w-72 rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>

                    {editError && (
                      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {editError}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <DetailSection title="Chief Complaints" icon={Stethoscope}>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {consultation.complaints}
                </p>
              </DetailSection>

              <DetailSection title="History & Examination" icon={FileText}>
                <DetailField
                  label="History of Present Illness"
                  value={consultation.history_of_present_illness}
                />
                <DetailField
                  label="Past Medical History"
                  value={consultation.past_medical_history}
                />
                <DetailField
                  label="Examination Findings"
                  value={consultation.examination_findings}
                />
              </DetailSection>

              <DetailSection title="Assessment & Plan" icon={FileText}>
                <DetailField label="Diagnosis" value={consultation.diagnosis} />
                {consultation.differential_diagnosis &&
                  consultation.differential_diagnosis.length > 0 && (
                    <div className="mb-3">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Differential Diagnosis
                      </dt>
                      <dd className="mt-1">
                        <div className="flex flex-wrap gap-2">
                          {consultation.differential_diagnosis.map((dx, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                            >
                              {dx}
                            </span>
                          ))}
                        </div>
                      </dd>
                    </div>
                  )}
                <DetailField
                  label="Treatment Plan"
                  value={consultation.treatment_plan}
                />
              </DetailSection>

              {(consultation.follow_up_date ||
                consultation.follow_up_notes) && (
                <DetailSection title="Follow-up" icon={Calendar}>
                  {consultation.follow_up_date && (
                    <p className="text-sm text-gray-900 mb-2">
                      <span className="font-medium">Date:</span>{' '}
                      {new Date(consultation.follow_up_date).toLocaleDateString(
                        'en-GB',
                        {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        },
                      )}
                    </p>
                  )}
                  {consultation.follow_up_notes && (
                    <p className="text-sm text-gray-600">
                      {consultation.follow_up_notes}
                    </p>
                  )}
                </DetailSection>
              )}
            </div>
          )}

          {activeTab === 'lab' && (
            <div className="space-y-3">
              {consultation.lab_requests &&
              consultation.lab_requests.length > 0 ? (
                consultation.lab_requests.map((req) => (
                  <OrderCard
                    orderKey={`lab-${req.request_id}`}
                    key={req.request_id}
                    title={req.test?.test_name || 'Unknown Test'}
                    status={req.status}
                    details={req.result || undefined}
                    statusColor={getLabStatusColor(req.status)}
                    isExpanded={Boolean(
                      expandedOrderIds[`lab-${req.request_id}`],
                    )}
                    onToggle={toggleOrderDetails}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FlaskConical size={40} className="mx-auto mb-2 opacity-50" />
                  <p>No lab tests ordered</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'radiology' && (
            <div className="space-y-3">
              {consultation.radiology_requests &&
              consultation.radiology_requests.length > 0 ? (
                consultation.radiology_requests.map((req) => (
                  <OrderCard
                    orderKey={`radiology-${req.request_id}`}
                    key={req.request_id}
                    title={req.imaging?.imaging_name || 'Unknown Imaging'}
                    status={req.status}
                    details={req.report || undefined}
                    statusColor={getRadiologyStatusColor(req.status)}
                    isExpanded={Boolean(
                      expandedOrderIds[`radiology-${req.request_id}`],
                    )}
                    onToggle={toggleOrderDetails}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Scan size={40} className="mx-auto mb-2 opacity-50" />
                  <p>No radiology tests ordered</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'procedures' && (
            <div className="space-y-3">
              {consultation.procedure_requests &&
              consultation.procedure_requests.length > 0 ? (
                consultation.procedure_requests.map((req) => (
                  <OrderCard
                    orderKey={`procedure-${req.request_id}`}
                    key={req.request_id}
                    title={req.procedure?.procedure_name || 'Unknown Procedure'}
                    status={req.status}
                    details={req.notes || undefined}
                    statusColor={getProcedureStatusColor(req.status)}
                    isExpanded={Boolean(
                      expandedOrderIds[`procedure-${req.request_id}`],
                    )}
                    onToggle={toggleOrderDetails}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity size={40} className="mx-auto mb-2 opacity-50" />
                  <p>No procedures ordered</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'prescriptions' && (
            <div className="space-y-3">
              {consultation.prescriptions &&
              consultation.prescriptions.length > 0 ? (
                consultation.prescriptions.map((rx) => (
                  <div
                    key={rx.prescription_id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {rx.drug?.drug_name} ({rx.drug?.strength})
                      </span>
                      <StatusBadge
                        status={rx.status}
                        variant={getPrescriptionStatusColor(rx.status)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Dosage:</span> {rx.dosage}
                      </div>
                      <div>
                        <span className="font-medium">Frequency:</span>{' '}
                        {rx.frequency}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span>{' '}
                        {rx.duration || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Route:</span> {rx.route}
                      </div>
                      <div>
                        <span className="font-medium">Qty:</span>{' '}
                        {rx.quantity_prescribed}
                      </div>
                      {rx.quantity_dispensed > 0 && (
                        <div>
                          <span className="font-medium">Dispensed:</span>{' '}
                          {rx.quantity_dispensed}
                        </div>
                      )}
                    </div>
                    {rx.instructions && (
                      <p className="mt-2 text-sm text-gray-500 italic">
                        {rx.instructions}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Pill size={40} className="mx-auto mb-2 opacity-50" />
                  <p>No prescriptions</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 15-Minute Edit Window Notice */}
        {isDoctor && (
          <div
            className={`mb-4 p-3 rounded-lg border ${
              canEditWithinWindow
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-start gap-2">
              {canEditWithinWindow ? (
                <>
                  <Clock size={18} className="text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Edit Window Active
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">
                      You can edit this consultation. Time remaining:{' '}
                      <strong>{editTimeRemaining}</strong>
                    </p>
                    <p className="text-xs text-green-500 mt-1">
                      Expires:{' '}
                      {editWindowExpiry.toLocaleString('en-NG', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={18} className="text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Edit Window Expired
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      The 15-minute edit window for this consultation has
                      expired.
                    </p>
                    <p className="text-xs text-amber-500 mt-1">
                      Expired:{' '}
                      {editWindowExpiry.toLocaleString('en-NG', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            {onPrint && (
              <Button variant="secondary" icon={Printer} onClick={onPrint}>
                Print
              </Button>
            )}
            {isEditingRecord ? (
              <>
                <Button
                  variant="secondary"
                  onClick={handleCancelEdit}
                  disabled={Boolean(isSavingEdit)}
                >
                  Cancel Edit
                </Button>
                <Button
                  icon={Save}
                  onClick={handleSaveEdit}
                  isLoading={Boolean(isSavingEdit)}
                >
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                {canInlineEdit && (
                  <Button icon={Edit} onClick={handleBeginEdit}>
                    Edit ({editTimeRemaining})
                  </Button>
                )}
                {!canInlineEdit && onEdit && canEditWithinWindow && (
                  <Button icon={Edit} onClick={onEdit}>
                    Edit ({editTimeRemaining})
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </SlideOver>
  );
}
