import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
  CheckCircle,
  Scissors,
  FileText,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { useSurgeries } from '../hooks/useSurgery';
import {
  SurgeryIntraOpData,
  WoundClassification,
  SurgeryWithDetails,
  getWoundClassificationDescription,
} from '../types/surgery.types';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';
import TemplateSearchPopover from '../../../components/ui/TemplateSearchPopover';

const SurgeryIntraOpForm: React.FC = () => {
  const navigate = useNavigate();
  const { surgeryId } = useParams<{ surgeryId: string }>();

  const { getSurgeryById, documentIntraOp } = useSurgeries();

  const [surgeryInfo, setSurgeryInfo] = useState<{
    number: string;
    patient: string;
  }>({
    number: '',
    patient: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [position, setPosition] = useState('');
  const [skinPrep, setSkinPrep] = useState('');
  const [approach, setApproach] = useState('');
  const [incision, setIncision] = useState('');
  const [findings, setFindings] = useState('');
  const [procedureDetails, setProcedureDetails] = useState('');
  const [technique, setTechnique] = useState('');
  const [bloodLoss, setBloodLoss] = useState<number>(0);
  const [woundClass, setWoundClass] = useState<WoundClassification>('Clean');
  const [complications, setComplications] = useState('');

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
      populateForm(surgery);
    }
  };

  const populateForm = (data: SurgeryWithDetails) => {
    setPosition(data.patient_position || '');
    setSkinPrep(data.skin_prep || '');
    setApproach(data.approach || '');
    setIncision(data.incision || '');
    setFindings(data.findings || '');
    setProcedureDetails(data.procedure_details || '');
    setTechnique(data.technique_description || '');
    setBloodLoss(data.estimated_blood_loss_ml || 0);
    setWoundClass(data.wound_classification || 'Clean');
    setComplications(data.intraop_complications || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surgeryId) return;

    setSaving(true);
    setError(null);

    const formData: SurgeryIntraOpData = {
      patient_position: position,
      skin_prep: skinPrep,
      approach,
      incision,
      findings,
      procedure_details: procedureDetails,
      technique_description: technique,
      estimated_blood_loss_ml: bloodLoss,
      wound_classification: woundClass,
      intraop_complications: complications,
    };

    const success = await documentIntraOp(surgeryId, formData);

    setSaving(false);
    if (success) {
      setSuccess(true);
      setTimeout(() => {
        navigate(`/surgery/${surgeryId}`);
      }, 1500);
    } else {
      setError('Failed to save intra-operative details.');
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
          <h1 className="text-2xl font-bold text-gray-900">Surgical Details</h1>
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
            Records updated successfully!
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Setup & Approach */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-gray-500" />
            Setup & Approach
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient Position
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Supine, Lithotomy"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skin Preparation
              </label>
              <input
                type="text"
                value={skinPrep}
                onChange={(e) => setSkinPrep(e.target.value)}
                placeholder="e.g. Chlorhexidine, Betadine"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Surgical Approach
              </label>
              <input
                type="text"
                value={approach}
                onChange={(e) => setApproach(e.target.value)}
                placeholder="e.g. Open, Laparoscopic"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Incision Type
              </label>
              <input
                type="text"
                value={incision}
                onChange={(e) => setIncision(e.target.value)}
                placeholder="e.g. Midline, Pfannenstiel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Procedure Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Scissors className="h-5 w-5 text-gray-500" />
            Surgical Findings & Technique
          </h2>
          <div className="space-y-4">
            <div className="flex justify-end">
              <TemplateSearchPopover
                templateType="surgery"
                category="surgery_intraop"
                currentValues={{ intraop_findings: findings, procedure_details: procedureDetails, intraop_complications: complications }}
                onTemplateSelect={(data) => {
                  if (data.intraop_findings) setFindings(data.intraop_findings);
                  if (data.procedure_details) setProcedureDetails(data.procedure_details);
                  if (data.intraop_complications) setComplications(data.intraop_complications);
                }}
                buttonText="Fill All Fields"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Operative Findings
                </label>
                <SavedNotesPopover
                  category="surgery_notes"
                  subcategory="operative_findings"
                  currentValue={findings}
                  onInsert={(content) => setFindings(content)}
                />
              </div>
              <textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe anatomy, pathology found..."
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Procedure Details
                </label>
                <SavedNotesPopover
                  category="surgery_notes"
                  subcategory="procedure_details"
                  currentValue={procedureDetails}
                  onInsert={(content) => setProcedureDetails(content)}
                />
              </div>
              <textarea
                value={procedureDetails}
                onChange={(e) => setProcedureDetails(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Step-by-step description of procedure..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Significant Complications
              </label>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-1" />
                <textarea
                  value={complications}
                  onChange={(e) => setComplications(e.target.value)}
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any inadvertent injury or complication..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Outcomes */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            Classification & Output
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Blood Loss (ml)
              </label>
              <input
                type="number"
                min="0"
                value={bloodLoss}
                onChange={(e) => setBloodLoss(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wound Classification
              </label>
              <select
                value={woundClass}
                onChange={(e) =>
                  setWoundClass(e.target.value as WoundClassification)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Clean">Clean</option>
                <option value="Clean_Contaminated">Clean-Contaminated</option>
                <option value="Contaminated">Contaminated</option>
                <option value="Dirty_Infected">Dirty/Infected</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {getWoundClassificationDescription(woundClass)}
              </p>
            </div>
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
                Save Details
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SurgeryIntraOpForm;
