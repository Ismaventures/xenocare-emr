import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
  CheckCircle,
  Stethoscope,
  Activity,
  Heart,
  Wind,
  Droplets,
  AlertTriangle,
} from 'lucide-react';
import { usePreopAssessments, useSurgeries } from '../hooks/useSurgery';
import {
  SurgeryPreopAssessment,
  ASAClassification,
  getASADescription,
} from '../types/surgery.types';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';

const SurgeryPreopForm: React.FC = () => {
  const navigate = useNavigate();
  const { surgeryId } = useParams<{ surgeryId: string }>();

  const { getSurgeryById } = useSurgeries();
  const { getAssessment, saveAssessment, loading } = usePreopAssessments();

  const [surgeryNumber, setSurgeryNumber] = useState('');
  const [patientName, setPatientName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [asaClass, setAsaClass] = useState<ASAClassification>('ASA_I');
  const [mallampati, setMallampati] = useState('I');
  const [fastingHours, setFastingHours] = useState<number>(0);
  const [fastingStatus, setFastingStatus] = useState('');
  const [fitForSurgery, setFitForSurgery] = useState(true);

  // Risk Assessments
  const [cardiacRisk, setCardiacRisk] = useState('');
  const [pulmonaryRisk, setPulmonaryRisk] = useState('');
  const [bleedingRisk, setBleedingRisk] = useState('');

  // Checklist
  const [allergiesVerified, setAllergiesVerified] = useState(false);
  const [medsReviewed, setMedsReviewed] = useState(false);
  const [crossmatchOrdered, setCrossmatchOrdered] = useState(false);
  const [bloodUnits, setBloodUnits] = useState(0);

  // Notes
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (surgeryId) {
      loadData();
    }
  }, [surgeryId]);

  const loadData = async () => {
    if (!surgeryId) return;

    // Load surgery details for context
    const surgery = await getSurgeryById(surgeryId);
    if (surgery) {
      setSurgeryNumber(surgery.surgery_number);
      setPatientName(surgery.patient_name || 'Unknown Patient');
    }

    // Load existing assessment
    const existing = await getAssessment(surgeryId);
    if (existing) {
      populateForm(existing);
    }
  };

  const populateForm = (data: SurgeryPreopAssessment) => {
    setAsaClass(data.asa_classification);
    setMallampati(data.mallampati_class || 'I');
    setFastingHours(data.fasting_hours || 0);
    setFastingStatus(data.fasting_status || '');
    setFitForSurgery(data.fit_for_surgery ?? true);
    setCardiacRisk(data.cardiac_risk || '');
    setPulmonaryRisk(data.pulmonary_risk || '');
    setBleedingRisk(data.bleeding_risk || '');
    setAllergiesVerified(data.allergies_verified || false);
    setMedsReviewed(data.medications_reviewed || false);
    setCrossmatchOrdered(data.crossmatch_ordered || false);
    setBloodUnits(data.blood_units_ordered || 0);
    setNotes(data.clearance_notes || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surgeryId) return;

    setSaving(true);
    setError(null);

    const formData = {
      asa_classification: asaClass,
      mallampati_class: mallampati,
      fasting_hours: fastingHours,
      fasting_status: fastingStatus,
      fit_for_surgery: fitForSurgery,
      cardiac_risk: cardiacRisk,
      pulmonary_risk: pulmonaryRisk,
      bleeding_risk: bleedingRisk,
      allergies_verified: allergiesVerified,
      medications_reviewed: medsReviewed,
      crossmatch_ordered: crossmatchOrdered,
      blood_units_ordered: bloodUnits,
      clearance_notes: notes,
    };

    const success = await saveAssessment(surgeryId, formData);

    setSaving(false);
    if (success) {
      setSuccess(true);
      setTimeout(() => {
        navigate(`/surgery/${surgeryId}`);
      }, 1500);
    } else {
      setError('Failed to save assessment. Please try again.');
    }
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
            Pre-Operative Assessment
          </h1>
          <p className="text-sm text-gray-500">
            {surgeryNumber} • {patientName}
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
            Assessment saved successfully!
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ASA Classification */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-500" />
            ASA Physical Status Classification
          </h2>
          <div className="space-y-3">
            {(
              [
                'ASA_I',
                'ASA_II',
                'ASA_III',
                'ASA_IV',
                'ASA_V',
                'ASA_VI',
              ] as const
            ).map((asa) => (
              <label
                key={asa}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="asaClass"
                  value={asa}
                  checked={asaClass === asa}
                  onChange={(e) =>
                    setAsaClass(e.target.value as ASAClassification)
                  }
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">
                    {asa.replace('_', ' ')}
                  </span>
                  <p className="text-sm text-gray-500">
                    {getASADescription(asa)}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Airway & Fasting */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wind className="h-5 w-5 text-gray-500" />
            Airway & Fasting
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mallampati Classification
              </label>
              <select
                value={mallampati}
                onChange={(e) => setMallampati(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="I">Class I - Full visibility</option>
                <option value="II">Class II - Uvula base visible</option>
                <option value="III">
                  Class III - Only soft palate visible
                </option>
                <option value="IV">Class IV - Only hard palate visible</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fasting Duration (Hours)
              </label>
              <input
                type="number"
                min="0"
                value={fastingHours}
                onChange={(e) => setFastingHours(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Clinical Risk Assessment */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-gray-500" />
            Clinical Risk Assessment
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Cardiac Risk Notes
                </label>
                <SavedNotesPopover
                  category="surgery_notes"
                  subcategory="cardiac_risk"
                  currentValue={cardiacRisk}
                  onInsert={(content) => setCardiacRisk(content)}
                />
              </div>
              <textarea
                value={cardiacRisk}
                onChange={(e) => setCardiacRisk(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="History of MI, HF, Arrhythmia..."
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Pulmonary Risk Notes
                </label>
                <SavedNotesPopover
                  category="surgery_notes"
                  subcategory="pulmonary_risk"
                  currentValue={pulmonaryRisk}
                  onInsert={(content) => setPulmonaryRisk(content)}
                />
              </div>
              <textarea
                value={pulmonaryRisk}
                onChange={(e) => setPulmonaryRisk(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="COPD, Asthma, Smoking history..."
              />
            </div>
          </div>
        </div>

        {/* Verification & Planning */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-gray-500" />
            Verification & Planning
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allergies"
                checked={allergiesVerified}
                onChange={(e) => setAllergiesVerified(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label
                htmlFor="allergies"
                className="text-sm font-medium text-gray-700"
              >
                Allergies Verified
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="meds"
                checked={medsReviewed}
                onChange={(e) => setMedsReviewed(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label
                htmlFor="meds"
                className="text-sm font-medium text-gray-700"
              >
                Current Medications Reviewed
              </label>
            </div>

            <div className="pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="crossmatch"
                  checked={crossmatchOrdered}
                  onChange={(e) => setCrossmatchOrdered(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label
                  htmlFor="crossmatch"
                  className="text-sm font-medium text-gray-700"
                >
                  Blood Crossmatch Ordered
                </label>
              </div>

              {crossmatchOrdered && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Units Ordered
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bloodUnits}
                    onChange={(e) =>
                      setBloodUnits(parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Final Clearance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-gray-500" />
            Final Clearance
          </h2>

          <div className="mb-4">
            <label className="flex items-center gap-3 p-3 bg-gray-50 border rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={fitForSurgery}
                onChange={(e) => setFitForSurgery(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="font-semibold text-gray-900">
                Patient is fit for scheduled surgery
              </span>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                Clearance Notes & Special Considerations
              </label>
              <SavedNotesPopover
                category="surgery_notes"
                subcategory="clearance_notes"
                currentValue={notes}
                onInsert={(content) => setNotes(content)}
              />
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(`/surgery/${surgeryId}`)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Assessment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SurgeryPreopForm;
