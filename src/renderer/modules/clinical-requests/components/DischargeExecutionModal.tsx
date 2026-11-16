/**
 * Discharge Execution Modal
 * =========================
 * Modal for executing approved discharge requests
 * - Complete discharge checklist
 * - Generate discharge summary
 * - Update patient status
 * - Release bed
 */

import React, { useState, useRef } from 'react';
import { format, differenceInDays } from 'date-fns';
import {
  X,
  User,
  LogOut,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FileText,
  Bed,
  Building2,
  Clipboard,
  Printer,
  Home,
  Ambulance,
  Building,
  AlertOctagon,
} from 'lucide-react';
import {
  ClinicalRequestWithDetailsDTO,
  URGENCY_CONFIG,
} from '../dtos/clinical-request.dto';
import { useAuth } from '../../../contexts/AuthContext';
import {
  DischargeChecklist,
  ChecklistItem,
} from '../../in-patient/components/DischargeChecklist';
import {
  DischargeSummary,
  DischargeSummaryData,
} from '../../in-patient/components/DischargeSummary';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';
import TemplateSearchPopover from '../../../components/ui/TemplateSearchPopover';

interface AdmissionInfo {
  id: string;
  admission_number: string;
  admission_date: string;
  ward_id: string;
  ward_name: string;
  bed_id: string;
  bed_number: string;
  admitting_diagnosis?: string;
  attending_physician_name?: string;
}

interface DischargeExecutionData {
  request_id: string;
  patient_id: string;
  admission_id: string;
  encounter_id: string;
  ward_id: string;
  bed_id: string;
  discharge_date: string;
  discharge_time: string;
  discharge_condition: string;
  discharge_disposition: string;
  primary_discharge_diagnosis: string;
  secondary_diagnoses?: string[];
  procedures_performed?: string[];
  discharge_medications?: {
    name: string;
    dosage: string;
    frequency: string;
    duration?: string;
    instructions?: string;
  }[];
  follow_up_instructions?: string;
  activity_restrictions?: string;
  dietary_instructions?: string;
  warning_signs?: string[];
  discharge_summary_data?: Record<string, unknown>;
  notes?: string;
}

export interface DischargeExecutionModalData extends DischargeExecutionData {}

interface DischargeExecutionModalProps {
  request: ClinicalRequestWithDetailsDTO;
  admission: AdmissionInfo;
  isOpen: boolean;
  onClose: () => void;
  onExecute: (data: DischargeExecutionData) => Promise<void>;
}

// Discharge conditions
const DISCHARGE_CONDITIONS = [
  { value: 'Improved', label: 'Improved' },
  { value: 'Stable', label: 'Stable' },
  { value: 'Cured', label: 'Cured' },
  { value: 'Unchanged', label: 'Unchanged' },
  { value: 'Critical', label: 'Critical - Against Medical Advice' },
  { value: 'Deceased', label: 'Deceased' },
];

// Discharge dispositions
const DISCHARGE_DISPOSITIONS = [
  { value: 'Home', label: 'Home', icon: Home },
  { value: 'Home with Care', label: 'Home with Home Care', icon: Home },
  { value: 'Transfer', label: 'Transfer to Another Facility', icon: Ambulance },
  { value: 'SNF', label: 'Skilled Nursing Facility', icon: Building },
  { value: 'Rehab', label: 'Rehabilitation Center', icon: Building },
  { value: 'AMA', label: 'Against Medical Advice', icon: AlertOctagon },
  { value: 'Deceased', label: 'Deceased', icon: AlertOctagon },
];

type TabType = 'checklist' | 'details' | 'summary';

export const DischargeExecutionModal: React.FC<
  DischargeExecutionModalProps
> = ({ request, admission, isOpen, onClose, onExecute }) => {
  const { session } = useAuth();
  const summaryRef = useRef<HTMLDivElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('checklist');

  // Checklist state - track items that have been toggled
  const [completedChecklistItems, setCompletedChecklistItems] = useState<
    Set<string>
  >(new Set());
  const [checklistAllComplete, setChecklistAllComplete] = useState(false);

  // Form state
  const [dischargeDate, setDischargeDate] = useState(
    format(new Date(), 'yyyy-MM-dd'),
  );
  const [dischargeTime, setDischargeTime] = useState(
    format(new Date(), 'HH:mm'),
  );
  const [dischargeCondition, setDischargeCondition] = useState('Improved');
  const [dischargeDisposition, setDischargeDisposition] = useState('Home');
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState(
    admission.admitting_diagnosis || request.clinical_reason || '',
  );
  const [secondaryDiagnoses, setSecondaryDiagnoses] = useState<string[]>([]);
  const [newSecondaryDiagnosis, setNewSecondaryDiagnosis] = useState('');
  const [proceduresPerformed, setProceduresPerformed] = useState<string[]>([]);
  const [newProcedure, setNewProcedure] = useState('');
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [activityRestrictions, setActivityRestrictions] = useState('');
  const [dietaryInstructions, setDietaryInstructions] = useState('');
  const [warningSignsText, setWarningSignsText] = useState('');
  const [hospitalCourse, setHospitalCourse] = useState('');
  const [notes, setNotes] = useState(request.notes || '');

  // Medications (simplified - in real app would pull from pharmacy orders)
  const [medications, setMedications] = useState<
    {
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
    }[]
  >([]);
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const urgencyConfig = URGENCY_CONFIG[request.urgency];

  const lengthOfStay =
    differenceInDays(
      new Date(dischargeDate),
      new Date(admission.admission_date),
    ) + 1;

  const calculateAge = (dob?: string) => {
    if (!dob) return '';
    const today = new Date();
    const birthDate = new Date(dob);
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
  };

  // Get checklist completion percentage (simple approximation when using the external component)
  const getChecklistProgress = () => {
    return checklistAllComplete ? 100 : completedChecklistItems.size * 10;
  };

  const allRequiredComplete = () => {
    return checklistAllComplete;
  };

  // Handle checklist item toggle
  const handleChecklistItemToggle = (
    itemId: string,
    completed: boolean,
    notes?: string,
  ) => {
    setCompletedChecklistItems((prev) => {
      const updated = new Set(prev);
      if (completed) {
        updated.add(itemId);
      } else {
        updated.delete(itemId);
      }
      return updated;
    });
  };

  // Handle when all checklist items are complete
  const handleChecklistAllComplete = () => {
    setChecklistAllComplete(true);
  };

  // Add secondary diagnosis
  const addSecondaryDiagnosis = () => {
    if (newSecondaryDiagnosis.trim()) {
      setSecondaryDiagnoses([
        ...secondaryDiagnoses,
        newSecondaryDiagnosis.trim(),
      ]);
      setNewSecondaryDiagnosis('');
    }
  };

  // Add procedure
  const addProcedure = () => {
    if (newProcedure.trim()) {
      setProceduresPerformed([...proceduresPerformed, newProcedure.trim()]);
      setNewProcedure('');
    }
  };

  // Add medication
  const addMedication = () => {
    if (newMed.name.trim() && newMed.dosage.trim() && newMed.frequency.trim()) {
      setMedications([...medications, { ...newMed }]);
      setNewMed({
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      });
    }
  };

  // Build discharge summary data
  const buildSummaryData = (): DischargeSummaryData => {
    return {
      // Patient
      patientName: request.patient_name || '',
      emrNumber: request.emr_number || '',
      dateOfBirth: request.patient_dob || '',
      gender: request.patient_gender || '',
      phone: request.patient_phone,

      // Admission
      admissionNumber: admission.admission_number,
      admissionDate: admission.admission_date,
      dischargeDate,
      wardName: admission.ward_name,
      bedNumber: admission.bed_number,
      lengthOfStay,

      // Clinical
      admittingDiagnosis:
        admission.admitting_diagnosis || request.clinical_reason || '',
      primaryDischargeDiagnosis: primaryDiagnosis,
      secondaryDiagnoses:
        secondaryDiagnoses.length > 0 ? secondaryDiagnoses : undefined,

      // Care team
      attendingPhysician:
        admission.attending_physician_name ||
        request.requesting_doctor_name ||
        '',

      // Course
      hospitalCourse: hospitalCourse || undefined,
      proceduresPerformed:
        proceduresPerformed.length > 0 ? proceduresPerformed : undefined,

      // Discharge
      dischargeCondition,
      dischargeDisposition,

      // Medications
      dischargeMedications: medications.length > 0 ? medications : undefined,

      // Instructions
      followUpInstructions: followUpInstructions || undefined,
      activityRestrictions: activityRestrictions || undefined,
      dietaryInstructions: dietaryInstructions || undefined,
      warningSignsToWatch: warningSignsText
        ? warningSignsText.split('\n').filter((s) => s.trim())
        : undefined,
      emergencyInstructions:
        'In case of emergency, call 112 or visit the nearest emergency department immediately.',
    };
  };

  const canSubmit = () => {
    return (
      allRequiredComplete() &&
      primaryDiagnosis.trim() &&
      dischargeCondition &&
      dischargeDisposition
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit()) {
      setError(
        'Please complete all required checklist items and fill in required fields',
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const data: DischargeExecutionData = {
        request_id: request.id,
        patient_id: request.patient_id,
        admission_id: admission.id,
        encounter_id: request.encounter_id,
        ward_id: admission.ward_id,
        bed_id: admission.bed_id,
        discharge_date: dischargeDate,
        discharge_time: dischargeTime,
        discharge_condition: dischargeCondition,
        discharge_disposition: dischargeDisposition,
        primary_discharge_diagnosis: primaryDiagnosis,
        secondary_diagnoses:
          secondaryDiagnoses.length > 0 ? secondaryDiagnoses : undefined,
        procedures_performed:
          proceduresPerformed.length > 0 ? proceduresPerformed : undefined,
        discharge_medications: medications.length > 0 ? medications : undefined,
        follow_up_instructions: followUpInstructions || undefined,
        activity_restrictions: activityRestrictions || undefined,
        dietary_instructions: dietaryInstructions || undefined,
        warning_signs: warningSignsText
          ? warningSignsText.split('\n').filter((s) => s.trim())
          : undefined,
        discharge_summary_data: buildSummaryData() as unknown as Record<
          string,
          unknown
        >,
        notes: notes || undefined,
      };

      await onExecute(data);
      onClose();
    } catch (err) {
      console.error('Error executing discharge:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to execute discharge',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintSummary = () => {
    const printContents = summaryRef.current?.innerHTML;
    if (printContents) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Discharge Summary - ${request.patient_name}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f5f5f5; }
              </style>
            </head>
            <body>${printContents}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-t-xl">
            <div className="flex items-center gap-3">
              <LogOut className="w-6 h-6" />
              <div>
                <h2 className="text-lg font-semibold">Execute Discharge</h2>
                <p className="text-orange-100 text-sm">
                  Request #{request.request_number} • Admission #
                  {admission.admission_number}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${urgencyConfig.bgColor} ${urgencyConfig.color}`}
              >
                {request.urgency}
              </span>
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('checklist')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === 'checklist'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clipboard className="w-4 h-4" />
              Checklist
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  getChecklistProgress() === 100
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {getChecklistProgress()}%
              </span>
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === 'details'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Discharge Details
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === 'summary'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Printer className="w-4 h-4" />
              Preview Summary
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {/* Patient & Admission Summary (always visible) */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <label className="text-xs text-gray-500">Patient</label>
                  <p className="font-medium">{request.patient_name}</p>
                  <p className="text-xs text-gray-500">{request.emr_number}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Ward / Bed</label>
                  <p className="font-medium">{admission.ward_name}</p>
                  <p className="text-xs text-gray-500">
                    Bed {admission.bed_number}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Admitted</label>
                  <p className="font-medium">
                    {format(new Date(admission.admission_date), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-gray-500">
                    LOS: {lengthOfStay} days
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    Admitting Diagnosis
                  </label>
                  <p className="font-medium text-xs">
                    {admission.admitting_diagnosis || request.clinical_reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'checklist' && (
              <DischargeChecklist
                admissionId={admission.id}
                patientName={request.patient_name || ''}
                onItemToggle={handleChecklistItemToggle}
                onAllComplete={handleChecklistAllComplete}
              />
            )}

            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Discharge Date/Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discharge Date *
                    </label>
                    <input
                      type="date"
                      value={dischargeDate}
                      onChange={(e) => setDischargeDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discharge Time
                    </label>
                    <input
                      type="time"
                      value={dischargeTime}
                      onChange={(e) => setDischargeTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Condition & Disposition */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Condition at Discharge *
                    </label>
                    <select
                      value={dischargeCondition}
                      onChange={(e) => setDischargeCondition(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      {DISCHARGE_CONDITIONS.map((condition) => (
                        <option key={condition.value} value={condition.value}>
                          {condition.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discharge Disposition *
                    </label>
                    <select
                      value={dischargeDisposition}
                      onChange={(e) => setDischargeDisposition(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      {DISCHARGE_DISPOSITIONS.map((disposition) => (
                        <option
                          key={disposition.value}
                          value={disposition.value}
                        >
                          {disposition.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Primary Diagnosis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Discharge Diagnosis *
                  </label>
                  <input
                    type="text"
                    value={primaryDiagnosis}
                    onChange={(e) => setPrimaryDiagnosis(e.target.value)}
                    placeholder="Enter primary discharge diagnosis"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                {/* Secondary Diagnoses */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Diagnoses
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newSecondaryDiagnosis}
                      onChange={(e) => setNewSecondaryDiagnosis(e.target.value)}
                      placeholder="Add secondary diagnosis"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      onKeyDown={(e) =>
                        e.key === 'Enter' && addSecondaryDiagnosis()
                      }
                    />
                    <button
                      type="button"
                      onClick={addSecondaryDiagnosis}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                  {secondaryDiagnoses.length > 0 && (
                    <ul className="space-y-1">
                      {secondaryDiagnoses.map((dx, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between bg-gray-50 px-3 py-1 rounded"
                        >
                          <span className="text-sm">{dx}</span>
                          <button
                            onClick={() =>
                              setSecondaryDiagnoses(
                                secondaryDiagnoses.filter(
                                  (_, idx) => idx !== i,
                                ),
                              )
                            }
                            className="text-red-500 text-xs"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Hospital Course */}
                <div>
                  <div className="flex justify-end mb-2">
                    <TemplateSearchPopover
                      templateType="inpatient"
                      category="discharge_notes"
                      currentValues={{ hospital_course: hospitalCourse, follow_up_instructions: followUpInstructions, activity_restrictions: activityRestrictions, dietary_instructions: dietaryInstructions, warning_signs: warningSignsText, notes }}
                      onTemplateSelect={(data) => {
                        if (data.hospital_course) setHospitalCourse(data.hospital_course);
                        if (data.follow_up_instructions) setFollowUpInstructions(data.follow_up_instructions);
                        if (data.activity_restrictions) setActivityRestrictions(data.activity_restrictions);
                        if (data.dietary_instructions) setDietaryInstructions(data.dietary_instructions);
                        if (data.warning_signs) setWarningSignsText(data.warning_signs);
                        if (data.notes) setNotes(data.notes);
                      }}
                      buttonText="Fill All Fields"
                    />
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Hospital Course Summary
                    </label>
                    <SavedNotesPopover
                      category="discharge_notes"
                      subcategory="hospital_course"
                      currentValue={hospitalCourse}
                      onInsert={(content) => setHospitalCourse(content)}
                    />
                  </div>
                  <textarea
                    value={hospitalCourse}
                    onChange={(e) => setHospitalCourse(e.target.value)}
                    placeholder="Brief summary of hospital course..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                {/* Procedures */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Procedures Performed
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newProcedure}
                      onChange={(e) => setNewProcedure(e.target.value)}
                      placeholder="Add procedure"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      onKeyDown={(e) => e.key === 'Enter' && addProcedure()}
                    />
                    <button
                      type="button"
                      onClick={addProcedure}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                  {proceduresPerformed.length > 0 && (
                    <ul className="space-y-1">
                      {proceduresPerformed.map((proc, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between bg-gray-50 px-3 py-1 rounded"
                        >
                          <span className="text-sm">{proc}</span>
                          <button
                            onClick={() =>
                              setProceduresPerformed(
                                proceduresPerformed.filter(
                                  (_, idx) => idx !== i,
                                ),
                              )
                            }
                            className="text-red-500 text-xs"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Follow-up Instructions */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Follow-up Instructions
                    </label>
                    <SavedNotesPopover
                      category="discharge_notes"
                      subcategory="follow_up_instructions"
                      currentValue={followUpInstructions}
                      onInsert={(content) => setFollowUpInstructions(content)}
                    />
                  </div>
                  <textarea
                    value={followUpInstructions}
                    onChange={(e) => setFollowUpInstructions(e.target.value)}
                    placeholder="Follow-up appointments, schedule, etc."
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                {/* Activity & Diet */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Activity Restrictions
                      </label>
                      <SavedNotesPopover
                        category="discharge_notes"
                        subcategory="activity_restrictions"
                        currentValue={activityRestrictions}
                        onInsert={(content) => setActivityRestrictions(content)}
                      />
                    </div>
                    <textarea
                      value={activityRestrictions}
                      onChange={(e) => setActivityRestrictions(e.target.value)}
                      placeholder="e.g., Bed rest for 1 week, avoid heavy lifting..."
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Dietary Instructions
                      </label>
                      <SavedNotesPopover
                        category="discharge_notes"
                        subcategory="dietary_instructions"
                        currentValue={dietaryInstructions}
                        onInsert={(content) => setDietaryInstructions(content)}
                      />
                    </div>
                    <textarea
                      value={dietaryInstructions}
                      onChange={(e) => setDietaryInstructions(e.target.value)}
                      placeholder="e.g., Low sodium diet, avoid alcohol..."
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Warning Signs */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Warning Signs to Watch (one per line)
                    </label>
                    <SavedNotesPopover
                      category="discharge_notes"
                      subcategory="warning_signs"
                      currentValue={warningSignsText}
                      onInsert={(content) => setWarningSignsText(content)}
                    />
                  </div>
                  <textarea
                    value={warningSignsText}
                    onChange={(e) => setWarningSignsText(e.target.value)}
                    placeholder="Fever above 38.5°C&#10;Severe headache&#10;Difficulty breathing..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Additional Notes
                    </label>
                    <SavedNotesPopover
                      category="discharge_notes"
                      subcategory="additional_notes"
                      currentValue={notes}
                      onInsert={(content) => setNotes(content)}
                    />
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes..."
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {activeTab === 'summary' && (
              <div ref={summaryRef}>
                <DischargeSummary
                  data={buildSummaryData()}
                  showPrintButton
                  onPrint={handlePrintSummary}
                />
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-6 py-3 bg-red-50 border-t border-red-200">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-xl">
            <div className="flex items-center gap-4">
              {/* Checklist Progress */}
              <div className="flex items-center gap-2">
                {allRequiredComplete() ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                )}
                <span
                  className={`text-sm ${allRequiredComplete() ? 'text-green-600' : 'text-yellow-600'}`}
                >
                  Checklist: {getChecklistProgress()}% complete
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !canSubmit()}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    Complete Discharge
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DischargeExecutionModal;
