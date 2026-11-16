import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
  CheckCircle,
  FileText,
  AlertTriangle,
  BedDouble,
  Activity,
  LogOut,
  Copy,
} from 'lucide-react';
import { useSurgeries } from '../hooks/useSurgery';
import {
  SurgeryPostOpData,
  SurgeryDisposition,
  SurgeryWithDetails,
} from '../types/surgery.types';
import { SkeletonForm } from '../../../components/ui/SkeletonLoader';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';
import TemplateSearchPopover from '../../../components/ui/TemplateSearchPopover';

const SurgeryPostOpForm: React.FC = () => {
  const navigate = useNavigate();
  const { surgeryId } = useParams<{ surgeryId: string }>();
  const { getSurgeryById, documentPostOp } = useSurgeries();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [surgery, setSurgery] = useState<SurgeryWithDetails | null>(null);

  // Form State
  const [postOpDiagnosis, setPostOpDiagnosis] = useState('');
  const [recoveryLocation, setRecoveryLocation] = useState('');
  const [disposition, setDisposition] = useState<SurgeryDisposition | ''>('');
  const [complications, setComplications] = useState('');
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    if (surgeryId) {
      loadSurgery(surgeryId);
    }
  }, [surgeryId]);

  const loadSurgery = async (id: string) => {
    setLoading(true);
    try {
      const data = await getSurgeryById(id);
      if (data) {
        setSurgery(data);
        setPostOpDiagnosis(data.post_op_diagnosis || '');
        setRecoveryLocation(data.recovery_location || '');
        setDisposition(data.disposition || '');
        setComplications(data.postop_complications || '');
        setInstructions(data.postop_instructions || '');
      } else {
        setError('Surgery not found');
      }
    } catch (err) {
      setError('Failed to load surgery details');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPreOpDiagnosis = () => {
    if (surgery && surgery.pre_op_diagnosis) {
      setPostOpDiagnosis(surgery.pre_op_diagnosis);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surgeryId) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const data: SurgeryPostOpData = {
        post_op_diagnosis: postOpDiagnosis,
        recovery_location: recoveryLocation,
        disposition: disposition as SurgeryDisposition,
        postop_complications: complications,
        postop_instructions: instructions,
      };

      const result = await documentPostOp(surgeryId, data);
      if (result) {
        setSuccess(true);
        // Navigate back after short delay
        setTimeout(() => {
          navigate(`/surgery/${surgeryId}`);
        }, 1500);
      } else {
        throw new Error('Failed to save post-op details');
      }
    } catch (err) {
      // Error is set by hook usually, but safety net
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SkeletonForm fields={6} />;
  }

  if (error && !surgery) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Surgery Details
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/surgery/${surgeryId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Post-Operative Details
              </h1>
              <p className="text-sm text-gray-600">
                {surgery?.surgery_number} • {surgery?.patient_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/surgery/${surgeryId}`)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
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
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto py-8 px-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Post-operative details saved successfully. Redirecting...
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-500" />
                Diagnostic Information
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Post-Operative Diagnosis
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={postOpDiagnosis}
                      onChange={(e) => setPostOpDiagnosis(e.target.value)}
                      placeholder="Enter confirmed diagnosis..."
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPreOpDiagnosis}
                    title="Copy Pre-Op Diagnosis"
                    className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-200 flex items-center gap-2 text-sm font-medium"
                  >
                    <Copy className="h-4 w-4" />
                    Same as Pre-Op
                  </button>
                </div>
                {surgery?.pre_op_diagnosis && (
                  <p className="mt-2 text-xs text-gray-500">
                    Pre-Op:{' '}
                    <span className="font-medium">
                      {surgery.pre_op_diagnosis}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BedDouble className="h-5 w-5 text-gray-500" />
                Recovery & Disposition
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recovery Location
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Activity className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={recoveryLocation}
                      onChange={(e) => setRecoveryLocation(e.target.value)}
                      placeholder="e.g. Main Recovery, PACU"
                      className="block w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Disposition
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LogOut className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      value={disposition}
                      onChange={(e) =>
                        setDisposition(e.target.value as SurgeryDisposition)
                      }
                      className="block w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border bg-white"
                    >
                      <option value="">Select Disposition...</option>
                      <option value="Ward">Ward</option>
                      <option value="ICU">ICU</option>
                      <option value="HDU">HDU</option>
                      <option value="PACU">PACU (Extended Stay)</option>
                      <option value="Day_Case_Discharge">
                        Day Case Discharge
                      </option>
                      <option value="Morgue">Morgue</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-gray-500" />
                Complications & Instructions
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex justify-end mb-1">
                <TemplateSearchPopover
                  templateType="surgery"
                  category="surgery_postop"
                  currentValues={{ post_op_complications: complications, discharge_instructions: instructions }}
                  onTemplateSelect={(data) => {
                    if (data.post_op_complications) setComplications(data.post_op_complications);
                    if (data.discharge_instructions) setInstructions(data.discharge_instructions);
                  }}
                  buttonText="Fill All Fields"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    Post-Operative Complications
                  </label>
                  <SavedNotesPopover
                    category="surgery_notes"
                    subcategory="post_op_complications"
                    currentValue={complications}
                    onInsert={(content) => setComplications(content)}
                  />
                </div>
                <textarea
                  rows={3}
                  value={complications}
                  onChange={(e) => setComplications(e.target.value)}
                  placeholder="Describe any complications during recovery..."
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave blank if no complications.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    Post-Op Instructions
                  </label>
                  <SavedNotesPopover
                    category="surgery_notes"
                    subcategory="post_op_instructions"
                    currentValue={instructions}
                    onInsert={(content) => setInstructions(content)}
                  />
                </div>
                <textarea
                  rows={4}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Specific instructions for ward/recovery staff..."
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurgeryPostOpForm;
