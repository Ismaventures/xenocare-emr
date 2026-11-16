import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
  CheckCircle,
  Clock,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { useSurgeries } from '../hooks/useSurgery';
import { SafeSurgeryChecklist } from '../types/surgery.types';
import { InlineGuidance } from '../../../components/guidance/InlineGuidance';
import { GuidanceTooltip } from '../../../components/guidance/GuidanceTooltip';

const SafeSurgeryChecklistForm: React.FC = () => {
  const navigate = useNavigate();
  const { surgeryId } = useParams<{ surgeryId: string }>();
  const {
    getSurgeryById,
    updateChecklist,
    loading: surgeryLoading,
  } = useSurgeries();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeStage, setActiveStage] = useState<
    'sign_in' | 'time_out' | 'sign_out'
  >('sign_in');

  // Basic Surgery Info
  const [surgeryInfo, setSurgeryInfo] = useState<{
    number: string;
    patient: string;
  }>({
    number: '',
    patient: '',
  });

  // Checklist State
  const [checklist, setChecklist] = useState<SafeSurgeryChecklist>({
    sign_in: {},
    time_out: {},
    sign_out: {},
  });

  useEffect(() => {
    if (surgeryId) {
      loadData();
    }
  }, [surgeryId]);

  const loadData = async () => {
    if (!surgeryId) return;

    const surgery = await getSurgeryById(surgeryId);
    if (surgery) {
      setSurgeryInfo({
        number: surgery.surgery_number,
        patient: surgery.patient_name || 'Unknown',
      });

      if (surgery.preop_checklist) {
        // Merge with default structure to ensure all keys exist
        setChecklist({
          sign_in: { ...checklist.sign_in, ...surgery.preop_checklist.sign_in },
          time_out: {
            ...checklist.time_out,
            ...surgery.preop_checklist.time_out,
          },
          sign_out: {
            ...checklist.sign_out,
            ...surgery.preop_checklist.sign_out,
          },
        });
      }

      // Determine active stage based on completion
      if (
        surgery.preop_checklist?.sign_in?.completed_at &&
        !surgery.preop_checklist?.time_out?.completed_at
      ) {
        setActiveStage('time_out');
      } else if (surgery.preop_checklist?.time_out?.completed_at) {
        setActiveStage('sign_out');
      }
    }
  };

  const handleCheckboxChange = (
    stage: 'sign_in' | 'time_out' | 'sign_out',
    field: string,
    checked: boolean,
  ) => {
    setChecklist((prev) => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        [field]: checked,
      },
    }));
  };

  const handleSaveStage = async (
    stage: 'sign_in' | 'time_out' | 'sign_out',
  ) => {
    if (!surgeryId) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Mark current stage as completed with timestamp
      const updatedChecklist = {
        ...checklist,
        [stage]: {
          ...checklist[stage],
          completed_at: new Date().toISOString(),
          // In a real app we'd get the user ID here too, but backend handles basic audit
        },
      };

      // Determine if entire checklist is complete (all 3 stages done)
      // Note: For this logic, we consider it "complete" if we are saving the Sign Out stage,
      // or if sign-out was already done.
      const isfullyCompleted =
        stage === 'sign_out' || !!checklist.sign_out.completed_at;

      const success = await updateChecklist(
        surgeryId,
        updatedChecklist,
        isfullyCompleted,
      );

      if (success) {
        setChecklist(updatedChecklist);
        setSuccess(true);

        // Auto-advance
        if (stage === 'sign_in') setActiveStage('time_out');
        if (stage === 'time_out') setActiveStage('sign_out');

        setTimeout(() => setSuccess(false), 2000);
      } else {
        setError('Failed to save checklist progress.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const isStageComplete = (stage: 'sign_in' | 'time_out' | 'sign_out') => {
    return !!checklist[stage].completed_at;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(`/surgery/${surgeryId}`)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            WHO Safe Surgery Checklist
          </h1>
          <p className="text-sm text-gray-500">
            {surgeryInfo.number} • {surgeryInfo.patient}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-sm text-green-700">
            Checklist updated successfully!
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveStage('sign_in')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
            activeStage === 'sign_in'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Sign In (Before Induction)
          {isStageComplete('sign_in') && (
            <CheckCircle className="h-4 w-4 text-green-500 ml-1" />
          )}
        </button>
        <button
          onClick={() => setActiveStage('time_out')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
            activeStage === 'time_out'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="h-4 w-4" />
          Time Out (Before Incision)
          {isStageComplete('time_out') && (
            <CheckCircle className="h-4 w-4 text-green-500 ml-1" />
          )}
        </button>
        <button
          onClick={() => setActiveStage('sign_out')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
            activeStage === 'sign_out'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <LogOut className="h-4 w-4" />
          Sign Out (Before Departure)
          {isStageComplete('sign_out') && (
            <CheckCircle className="h-4 w-4 text-green-500 ml-1" />
          )}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* SIGN IN SECTION */}
        {activeStage === 'sign_in' && (
          <div className="p-6 space-y-6">
            <InlineGuidance
              module="surgery"
              title="Sign In Phase"
              message="This phase must be completed before induction of anesthesia. The nurse and anesthetist must verbally confirm patient details."
              step={1}
              totalSteps={3}
            />

            <ChecklistItem
              id="signin-identity"
              label="Patient identity, site, procedure, and consent confirmed"
              checked={checklist.sign_in.patient_identity_confirmed}
              onChange={(c) =>
                handleCheckboxChange('sign_in', 'patient_identity_confirmed', c)
              }
            />
            <ChecklistItem
              id="signin-site"
              label="Site marked (or not applicable)"
              checked={checklist.sign_in.site_marked}
              onChange={(c) =>
                handleCheckboxChange('sign_in', 'site_marked', c)
              }
            />
            <ChecklistItem
              id="signin-safety"
              label="Anesthesia safety check completed (machine & medication check)"
              checked={checklist.sign_in.anesthesia_safety_check}
              onChange={(c) =>
                handleCheckboxChange('sign_in', 'anesthesia_safety_check', c)
              }
            />
            <ChecklistItem
              id="signin-pulse"
              label="Pulse oximeter on patient and functioning"
              checked={checklist.sign_in.pulse_oximeter_functional}
              onChange={(c) =>
                handleCheckboxChange('sign_in', 'pulse_oximeter_functional', c)
              }
            />
            <ChecklistItem
              id="signin-allergies"
              label="Does the patient have a known allergy? (Verified)"
              checked={checklist.sign_in.allergies_checked}
              onChange={(c) =>
                handleCheckboxChange('sign_in', 'allergies_checked', c)
              }
            />
            <ChecklistItem
              id="signin-airway"
              label="Difficult airway/aspiration risk? (Equipment/assistance available)"
              checked={checklist.sign_in.airway_risk_assessed}
              onChange={(c) =>
                handleCheckboxChange('sign_in', 'airway_risk_assessed', c)
              }
            />
            <ChecklistItem
              id="signin-blood"
              label="Risk of >500ml blood loss? (IV access/fluids planned)"
              checked={checklist.sign_in.blood_loss_risk_assessed}
              onChange={(c) =>
                handleCheckboxChange('sign_in', 'blood_loss_risk_assessed', c)
              }
            />

            <div className="mt-8 pt-6 border-t flex justify-end">
              <button
                onClick={() => handleSaveStage('sign_in')}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Confirm Sign In Complete
              </button>
            </div>
          </div>
        )}

        {/* TIME OUT SECTION */}
        {activeStage === 'time_out' && (
          <div className="p-6 space-y-6">
            <InlineGuidance
              module="surgery"
              title="Time Out Phase"
              message="Confirmed immediately before skin incision. All team members must pause and verbally confirm these items."
              step={2}
              totalSteps={3}
            />

            <ChecklistItem
              id="timeout-team"
              label="All team members have introduced themselves by name and role"
              checked={checklist.time_out.team_members_introduced}
              onChange={(c) =>
                handleCheckboxChange('time_out', 'team_members_introduced', c)
              }
            />
            <ChecklistItem
              id="timeout-patient"
              label="Surgeon, Anesthetist and Nurse confirm: Patient, Site and Procedure"
              checked={checklist.time_out.patient_identity_confirmed}
              onChange={(c) =>
                handleCheckboxChange(
                  'time_out',
                  'patient_identity_confirmed',
                  c,
                )
              }
            />
            <ChecklistItem
              id="timeout-abx"
              label="Antibiotic prophylaxis given within last 60 minutes?"
              checked={checklist.time_out.antibiotic_prophylaxis}
              onChange={(c) =>
                handleCheckboxChange('time_out', 'antibiotic_prophylaxis', c)
              }
            />

            <div className="my-4 p-4 bg-gray-50 rounded border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-2">
                Anticipated Critical Events discussed:
              </h4>
              <div className="space-y-3">
                <ChecklistItem
                  id="timeout-critical"
                  label="Surgeon: Critical/non-routine steps, duration, blood loss?"
                  checked={checklist.time_out.critical_steps_discussed}
                  onChange={(c) =>
                    handleCheckboxChange(
                      'time_out',
                      'critical_steps_discussed',
                      c,
                    )
                  }
                />
                <ChecklistItem
                  id="timeout-anesthesia"
                  label="Anesthetist: Any patient-specific concerns?"
                  checked={checklist.time_out.anesthesia_concerns}
                  onChange={(c) =>
                    handleCheckboxChange('time_out', 'anesthesia_concerns', c)
                  }
                />
                <ChecklistItem
                  id="timeout-nursing"
                  label="Nurse: Sterility confirmed? Equipment issues?"
                  checked={checklist.time_out.nursing_concerns}
                  onChange={(c) =>
                    handleCheckboxChange('time_out', 'nursing_concerns', c)
                  }
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t flex justify-end">
              <button
                onClick={() => handleSaveStage('time_out')}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Confirm Time Out Complete
              </button>
            </div>
          </div>
        )}

        {/* SIGN OUT SECTION */}
        {activeStage === 'sign_out' && (
          <div className="p-6 space-y-6">
            <InlineGuidance
              module="surgery"
              title="Sign Out Phase"
              message="Confirmed before the patient leaves the operating room. Ensure all counts are correct and specimens are labeled."
              step={3}
              totalSteps={3}
            />

            <ChecklistItem
              id="signout-proc"
              label="Nurse verbally confirms request procedure name recorded"
              checked={checklist.sign_out.procedure_confirmed}
              onChange={(c) =>
                handleCheckboxChange('sign_out', 'procedure_confirmed', c)
              }
            />
            <ChecklistItem
              id="signout-counts"
              label="Instrument, sponge and needle counts are correct"
              checked={checklist.sign_out.instrument_count_correct}
              onChange={(c) =>
                handleCheckboxChange('sign_out', 'instrument_count_correct', c)
              }
            />
            <ChecklistItem
              id="signout-specimen"
              label="Specimens labeled correctly (Patient name)"
              checked={checklist.sign_out.specimens_labeled}
              onChange={(c) =>
                handleCheckboxChange('sign_out', 'specimens_labeled', c)
              }
            />
            <ChecklistItem
              id="signout-equip"
              label="Any equipment problems to be addressed?"
              checked={checklist.sign_out.equipment_issues}
              onChange={(c) =>
                handleCheckboxChange('sign_out', 'equipment_issues', c)
              }
            />
            <ChecklistItem
              id="signout-recovery"
              label="Surgeon, Anesthetist and Nurse review key concerns for recovery/management"
              checked={checklist.sign_out.recovery_concerns}
              onChange={(c) =>
                handleCheckboxChange('sign_out', 'recovery_concerns', c)
              }
            />

            <div className="mt-8 pt-6 border-t flex justify-end gap-3">
              <button
                onClick={() => navigate(`/surgery/${surgeryId}`)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Done
              </button>
              <button
                onClick={() => handleSaveStage('sign_out')}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Complete Checklist & Exit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ChecklistItem: React.FC<{
  id: string;
  label: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
  helpText?: string;
}> = ({ id, label, checked, onChange, helpText }) => (
  <label
    htmlFor={id}
    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
      checked
        ? 'bg-blue-50 border-blue-200'
        : 'bg-white border-gray-200 hover:bg-gray-50'
    }`}
  >
    <input
      type="checkbox"
      id={id}
      checked={!!checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
    />
    <div className="flex-1">
      <span
        className={`text-base ${checked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}
      >
        {label}
      </span>
      {/* Inline help for specific items */}
      {helpText && (
        <div className="mt-1">
          <InlineGuidance
            module="surgery"
            message={helpText}
            className="text-xs p-2 mb-0 bg-yellow-50 border-yellow-100 text-yellow-800"
            dismissible={false}
          />
        </div>
      )}
    </div>
  </label>
);

export default SafeSurgeryChecklistForm;
