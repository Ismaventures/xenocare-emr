// =============================================================================
// NDC MEDICAL CENTRE EMR - Edit Care Team Modal
// Allows assigning/updating the care team for an admission
// (Attending Physician, Primary Nurse, Acuity, etc.)
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Stethoscope,
  Heart,
  AlertTriangle,
  Loader2,
  Save,
  Users,
  ShieldAlert,
  Utensils,
  Activity,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { supabase } from '../../../api/supabaseClient';
import { useUpdateAdmission } from '../hooks/useAdmissions';
import type {
  AdmissionWithDetails,
  ActiveAdmissionView,
  AcuityLevel,
  CodeStatus,
  UpdateAdmissionDTO,
} from '../../../types/database.types';

interface EditCareTeamModalProps {
  admission: AdmissionWithDetails | ActiveAdmissionView | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface StaffMember {
  id: string;
  staff_id: string;
  first_name: string;
  last_name: string;
  role: string;
  department?: string;
}

const acuityOptions: { value: AcuityLevel; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700' },
  {
    value: 'moderate',
    label: 'Moderate',
    color: 'bg-yellow-100 text-yellow-700',
  },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

const codeStatusOptions: {
  value: CodeStatus;
  label: string;
  description: string;
}[] = [
  {
    value: 'full_code',
    label: 'Full Code',
    description: 'All resuscitation measures',
  },
  { value: 'dnr', label: 'DNR', description: 'Do Not Resuscitate' },
  {
    value: 'dnr_dni',
    label: 'DNR/DNI',
    description: 'Do Not Resuscitate/Intubate',
  },
  {
    value: 'comfort_care',
    label: 'Comfort Care',
    description: 'Comfort measures only',
  },
];

const dietOptions = [
  'Regular',
  'NPO',
  'Clear Liquids',
  'Full Liquids',
  'Soft Diet',
  'Low Sodium',
  'Diabetic',
  'Renal',
  'Cardiac',
  'Low Fat',
  'Pureed',
  'Mechanical Soft',
  'High Protein',
  'Vegetarian',
  'Halal',
  'Kosher',
  'Gluten Free',
];

const activityLevels = [
  'Bedrest',
  'Bedrest with BRP',
  'OOB to Chair',
  'Ambulate with Assist',
  'Ambulate Independently',
  'Activity as Tolerated',
  'Physical Therapy',
];

const mobilityStatuses = [
  'Independent',
  'Requires Assistance',
  'Wheelchair',
  'Stretcher Only',
  'Bedbound',
  'Walker',
  'Cane',
  'Crutches',
];

const EditCareTeamModal: React.FC<EditCareTeamModalProps> = ({
  admission,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [doctors, setDoctors] = useState<StaffMember[]>([]);
  const [nurses, setNurses] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [attendingPhysicianId, setAttendingPhysicianId] = useState('');
  const [primaryNurseId, setPrimaryNurseId] = useState('');
  const [acuityLevel, setAcuityLevel] = useState<AcuityLevel>('moderate');
  const [codeStatus, setCodeStatus] = useState<CodeStatus>('full_code');
  const [isolationRequired, setIsolationRequired] = useState(false);
  const [isolationType, setIsolationType] = useState('');
  const [dietType, setDietType] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [mobilityStatus, setMobilityStatus] = useState('');
  const [notes, setNotes] = useState('');

  const updateAdmission = useUpdateAdmission();

  // Fetch staff members on mount
  useEffect(() => {
    async function fetchStaff() {
      setLoading(true);
      try {
        // Fetch doctors (doctors, specialists, consultants)
        const { data: doctorsData } = await supabase
          .from('staff')
          .select('id, staff_id, first_name, last_name, role, department')
          .in('role', [
            'doctor',
            'specialist',
            'consultant',
            'medical_director',
          ])
          .eq('status', 'active')
          .order('last_name');

        if (doctorsData) {
          setDoctors(doctorsData);
        }

        // Fetch nurses
        const { data: nursesData } = await supabase
          .from('staff')
          .select('id, staff_id, first_name, last_name, role, department')
          .in('role', [
            'nurse',
            'head_nurse',
            'nurse_manager',
            'nursing_officer',
          ])
          .eq('status', 'active')
          .order('last_name');

        if (nursesData) {
          setNurses(nursesData);
        }
      } catch (err) {
        console.error('Error fetching staff:', err);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      fetchStaff();
    }
  }, [isOpen]);

  // Initialize form with admission data
  useEffect(() => {
    if (admission) {
      // Handle both AdmissionWithDetails and ActiveAdmissionView
      const data = admission as any;
      setAttendingPhysicianId(data.attending_physician_id || '');
      setPrimaryNurseId(data.primary_nurse_id || '');
      setAcuityLevel(data.acuity_level || 'moderate');
      setCodeStatus(data.code_status || 'full_code');
      setIsolationRequired(data.isolation_required || false);
      setIsolationType(data.isolation_type || '');
      setDietType(data.diet_type || '');
      setActivityLevel(data.activity_level || '');
      setMobilityStatus(data.mobility_status || '');
      setNotes(data.notes || '');
    }
  }, [admission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!admission) return;

    const admissionId =
      (admission as any).admission_id || (admission as any).id;

    const updates: UpdateAdmissionDTO = {
      attending_physician_id: attendingPhysicianId || undefined,
      primary_nurse_id: primaryNurseId || undefined,
      acuity_level: acuityLevel,
      code_status: codeStatus,
      isolation_required: isolationRequired,
      isolation_type: isolationRequired ? isolationType : undefined,
      diet_type: dietType || undefined,
      activity_level: activityLevel || undefined,
      mobility_status: mobilityStatus || undefined,
      notes: notes || undefined,
    };

    try {
      await updateAdmission.mutateAsync({
        admissionId,
        updates,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error updating admission:', err);
    }
  };

  if (!admission) return null;

  const admissionData = admission as any;
  const patientName =
    `${admissionData.first_name || admissionData.patient?.first_name || ''} ${admissionData.last_name || admissionData.patient?.surname || ''}`.trim();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Care Team & Patient Status"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Info Header */}
        <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {patientName || 'Unknown Patient'}
            </h3>
            <p className="text-sm text-gray-500">
              {admissionData.hospital_id || admissionData.emr_number} •
              Admission: {admissionData.admission_number}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading staff...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Care Team Section */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Care Team
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Attending Physician */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Stethoscope className="h-4 w-4 inline mr-1.5 text-green-600" />
                    Attending Physician
                  </label>
                  <select
                    value={attendingPhysicianId}
                    onChange={(e) => setAttendingPhysicianId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Physician --</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.first_name} {doc.last_name} ({doc.staff_id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Primary Nurse */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Heart className="h-4 w-4 inline mr-1.5 text-pink-600" />
                    Primary Nurse
                  </label>
                  <select
                    value={primaryNurseId}
                    onChange={(e) => setPrimaryNurseId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Nurse --</option>
                    {nurses.map((nurse) => (
                      <option key={nurse.id} value={nurse.id}>
                        {nurse.first_name} {nurse.last_name} ({nurse.staff_id})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    The nurse primarily responsible for this patient's care
                  </p>
                </div>
              </div>
            </div>

            {/* Clinical Status Section */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                Clinical Status
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Acuity Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <AlertTriangle className="h-4 w-4 inline mr-1.5 text-orange-500" />
                    Acuity Level
                  </label>
                  <select
                    value={acuityLevel}
                    onChange={(e) =>
                      setAcuityLevel(e.target.value as AcuityLevel)
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {acuityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Code Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <ShieldAlert className="h-4 w-4 inline mr-1.5 text-red-500" />
                    Code Status
                  </label>
                  <select
                    value={codeStatus}
                    onChange={(e) =>
                      setCodeStatus(e.target.value as CodeStatus)
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {codeStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} - {opt.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Isolation */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isolationRequired}
                      onChange={(e) => setIsolationRequired(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Isolation Required
                    </span>
                  </label>

                  {isolationRequired && (
                    <input
                      type="text"
                      value={isolationType}
                      onChange={(e) => setIsolationType(e.target.value)}
                      placeholder="Isolation type (e.g., Contact, Droplet, Airborne)"
                      className="mt-2 w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Patient Care Orders Section */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Patient Care Orders
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Diet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Utensils className="h-4 w-4 inline mr-1.5 text-amber-500" />
                    Diet Type
                  </label>
                  <select
                    value={dietType}
                    onChange={(e) => setDietType(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Diet --</option>
                    {dietOptions.map((diet) => (
                      <option key={diet} value={diet}>
                        {diet}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Activity Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Activity Level
                  </label>
                  <select
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Activity --</option>
                    {activityLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mobility Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mobility Status
                  </label>
                  <select
                    value={mobilityStatus}
                    onChange={(e) => setMobilityStatus(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Mobility --</option>
                    {mobilityStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any additional notes about patient care..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateAdmission.isPending || loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {updateAdmission.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditCareTeamModal;
