// =============================================================================
// NDC MEDICAL CENTRE EMR - Admission Form Component
// Form for creating new patient admissions
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Bed,
  Stethoscope,
  AlertTriangle,
  Calendar,
  FileText,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import { useCreateAdmission } from '../hooks/useAdmissions';
import { WardBedSelector } from '../../clinical-requests/components/WardBedSelector';
import { useAuth } from '../../../contexts/AuthContext';
import PatientSearchInput from '../../../components/ui/PatientSearchInput';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';
import type { PatientDTO } from '../../patient-registration/dtos/patient.dto';
import type {
  AdmissionType,
  AdmissionSource,
  AcuityLevel,
  CreateAdmissionDTO,
} from '../../../types/database.types';

interface AdmissionFormProps {
  patientId?: string;
  encounterId?: string;
  initialWardId?: string;
  initialBedId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const admissionTypes: { value: AdmissionType; label: string }[] = [
  { value: 'emergency', label: 'Emergency' },
  { value: 'elective', label: 'Elective' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'observation', label: 'Observation' },
  { value: 'day_case', label: 'Day Case' },
];

const admissionSources: { value: AdmissionSource; label: string }[] = [
  { value: 'emergency', label: 'Emergency Department' },
  { value: 'outpatient', label: 'Outpatient Clinic' },
  { value: 'referral', label: 'External Referral' },
  { value: 'transfer', label: 'Transfer from Another Facility' },
  { value: 'direct', label: 'Direct Admission' },
];

const acuityLevels: { value: AcuityLevel; label: string; color: string }[] = [
  {
    value: 'low',
    label: 'Low',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  {
    value: 'high',
    label: 'High',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  {
    value: 'critical',
    label: 'Critical',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
];

const AdmissionForm: React.FC<AdmissionFormProps> = ({
  patientId: initialPatientId,
  encounterId,
  initialWardId,
  initialBedId,
  onSuccess,
  onCancel,
}) => {
  const [step, setStep] = useState(1);
  const [selectedPatientId, setSelectedPatientId] = useState(
    initialPatientId || '',
  );
  const [selectedPatient, setSelectedPatient] = useState<PatientDTO | null>(
    null,
  );
  const [selectedWardId, setSelectedWardId] = useState(initialWardId || '');
  const [selectedBedId, setSelectedBedId] = useState(initialBedId || '');
  const [selectedWard, setSelectedWard] = useState<any>(null);
  const [selectedBed, setSelectedBed] = useState<any>(null);

  const [formData, setFormData] = useState<Partial<CreateAdmissionDTO>>({
    admission_type: 'elective',
    admission_source: 'outpatient',
    acuity_level: 'moderate',
    admitting_diagnosis: '',
    chief_complaint: '',
    reason_for_admission: '',
    isolation_required: false,
  });

  const { staff } = useAuth();
  const facilityId = staff?.facility_id || '';
  const createAdmission = useCreateAdmission();

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedPatientId || !selectedWardId || !selectedBedId) {
      return;
    }

    try {
      await createAdmission.mutateAsync({
        patient_id: selectedPatientId,
        encounter_id: encounterId,
        ward_id: selectedWardId,
        bed_id: selectedBedId,
        admission_type: formData.admission_type!,
        admission_source: formData.admission_source,
        admitting_diagnosis: formData.admitting_diagnosis!,
        chief_complaint: formData.chief_complaint,
        reason_for_admission: formData.reason_for_admission,
        acuity_level: formData.acuity_level,
        isolation_required: formData.isolation_required,
        expected_discharge_date: formData.expected_discharge_date,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to create admission:', error);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!selectedPatientId;
      case 2:
        return !!selectedWardId && !!selectedBedId;
      case 3:
        return !!formData.admitting_diagnosis && !!formData.admission_type;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl border shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">New Admission</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {[
              { num: 1, label: 'Patient' },
              { num: 2, label: 'Ward & Bed' },
              { num: 3, label: 'Clinical Info' },
              { num: 4, label: 'Review' },
            ].map((s, i) => (
              <React.Fragment key={s.num}>
                {i > 0 && <div className="flex-1 h-0.5 bg-gray-200" />}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= s.num
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {s.num}
                  </div>
                  <span
                    className={`text-sm ${step >= s.num ? 'text-gray-900' : 'text-gray-500'}`}
                  >
                    {s.label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Step 1: Patient Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Patient by EMR Number or Name
                </label>
                <PatientSearchInput
                  value={selectedPatientId}
                  onChange={(patientId, patient) => {
                    setSelectedPatientId(patientId);
                    setSelectedPatient(patient);
                  }}
                  selectedPatient={selectedPatient}
                  placeholder="Search by EMR number (e.g., NDC-0001), name, or phone..."
                  autoFocus
                />
              </div>

              {selectedPatient && (
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Patient Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">EMR Number:</span>
                      <span className="ml-2 font-medium">
                        {selectedPatient.emr_number || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Category:</span>
                      <span className="ml-2 font-medium">
                        {selectedPatient.patient_category || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <span className="ml-2 font-medium">
                        {selectedPatient.contact_phone || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Insurance:</span>
                      <span className="ml-2 font-medium">
                        {selectedPatient.insurance_type || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Ward & Bed Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <WardBedSelector
                facilityId={facilityId}
                selectedWardId={selectedWardId}
                selectedBedId={selectedBedId}
                onWardSelect={(wardId, ward) => {
                  setSelectedWardId(wardId);
                  setSelectedWard(ward);
                  setSelectedBedId('');
                  setSelectedBed(null);
                }}
                onBedSelect={(bedId, bed) => {
                  setSelectedBedId(bedId);
                  setSelectedBed(bed);
                }}
                required
              />
            </div>
          )}

          {/* Step 3: Clinical Information */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admission Type *
                  </label>
                  <select
                    name="admission_type"
                    value={formData.admission_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {admissionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admission Source
                  </label>
                  <select
                    name="admission_source"
                    value={formData.admission_source}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {admissionSources.map((source) => (
                      <option key={source.value} value={source.value}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Acuity Level
                </label>
                <div className="flex gap-2">
                  {acuityLevels.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          acuity_level: level.value,
                        }))
                      }
                      className={`flex-1 py-2.5 rounded-lg border-2 font-medium transition-all ${
                        formData.acuity_level === level.value
                          ? `${level.color} border-current`
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Admitting Diagnosis *
                  </label>
                  <SavedNotesPopover
                    category="admission_notes"
                    subcategory="admitting_diagnosis"
                    currentValue={formData.admitting_diagnosis}
                    onInsert={(content) => setFormData(prev => ({ ...prev, admitting_diagnosis: content }))}
                  />
                </div>
                <textarea
                  name="admitting_diagnosis"
                  value={formData.admitting_diagnosis}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Primary diagnosis for admission..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chief Complaint
                </label>
                <input
                  type="text"
                  name="chief_complaint"
                  value={formData.chief_complaint}
                  onChange={handleInputChange}
                  placeholder="Patient's main complaint..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Admission
                </label>
                <textarea
                  name="reason_for_admission"
                  value={formData.reason_for_admission}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Detailed reason for hospitalization..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isolation_required"
                  name="isolation_required"
                  checked={formData.isolation_required}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label
                  htmlFor="isolation_required"
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Isolation Required
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Discharge Date
                </label>
                <input
                  type="date"
                  name="expected_discharge_date"
                  value={formData.expected_discharge_date || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Admission Summary
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Patient ID</p>
                    <p className="font-medium text-gray-900">
                      {selectedPatientId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Admission Type</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {formData.admission_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ward</p>
                    <p className="font-medium text-gray-900">
                      {selectedWard?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Bed</p>
                    <p className="font-medium text-gray-900">
                      {selectedBed?.bed_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Acuity Level</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {formData.acuity_level}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Isolation</p>
                    <p className="font-medium text-gray-900">
                      {formData.isolation_required ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">Admitting Diagnosis</p>
                  <p className="font-medium text-gray-900">
                    {formData.admitting_diagnosis}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onCancel())}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createAdmission.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createAdmission.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Confirm Admission
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdmissionForm;
