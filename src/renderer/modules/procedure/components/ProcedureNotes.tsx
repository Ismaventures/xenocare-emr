// =============================================================================
// NDC MEDICAL CENTRE EMR - Procedure Notes Component
// Documentation of procedure findings, complications, and outcomes
// Saves to procedures table: procedure_notes, findings, complications fields
// =============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Save,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Stethoscope,
  ClipboardList,
  AlertCircle,
  Syringe,
  FileCheck,
} from 'lucide-react';
import { useProcedure, useAddProcedureNotes } from '../hooks/useProcedures';
import { SkeletonForm } from '../../../components/ui/SkeletonLoader';
import { useDraftRestore } from '../../../hooks/useDraftRestore';

interface ProcedureNotesProps {
  procedureId: string;
}

const ProcedureNotes: React.FC<ProcedureNotesProps> = ({ procedureId }) => {
  const { data: procedure, isLoading: loadingProcedure } =
    useProcedure(procedureId);
  const saveNotes = useAddProcedureNotes();

  // Form state - maps to database columns
  const [procedureNotes, setProcedureNotes] = useState('');
  const [findings, setFindings] = useState('');
  const [techniqueDescription, setTechniqueDescription] = useState('');
  const [complications, setComplications] = useState('');
  const [estimatedBloodLoss, setEstimatedBloodLoss] = useState<string>('');
  const [postOpInstructions, setPostOpInstructions] = useState('');
  const [postOpDiagnosis, setPostOpDiagnosis] = useState('');

  // Track unsaved changes
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // ── Draft auto-save / restore ──────────────────────────────────────────
  const draftData = useMemo(
    () => ({
      procedureNotes,
      findings,
      techniqueDescription,
      complications,
      estimatedBloodLoss,
      postOpInstructions,
      postOpDiagnosis,
    }),
    [
      procedureNotes,
      findings,
      techniqueDescription,
      complications,
      estimatedBloodLoss,
      postOpInstructions,
      postOpDiagnosis,
    ],
  );

  const setDraftData = useCallback((d: typeof draftData) => {
    setProcedureNotes(d.procedureNotes);
    setFindings(d.findings);
    setTechniqueDescription(d.techniqueDescription);
    setComplications(d.complications);
    setEstimatedBloodLoss(d.estimatedBloodLoss);
    setPostOpInstructions(d.postOpInstructions);
    setPostOpDiagnosis(d.postOpDiagnosis);
    setHasChanges(true);
  }, []);

  const { clearDraft } = useDraftRestore(
    `procedure-notes-${procedureId}`,
    draftData,
    setDraftData,
  );

  // Load existing notes from procedure data
  useEffect(() => {
    if (procedure) {
      setProcedureNotes(procedure.procedure_notes || '');
      setFindings(procedure.findings || '');
      setTechniqueDescription(procedure.technique_description || '');
      setComplications(procedure.complications || '');
      setEstimatedBloodLoss(
        procedure.estimated_blood_loss_ml?.toString() || '',
      );
      setPostOpInstructions(procedure.post_op_instructions || '');
      setPostOpDiagnosis(procedure.post_op_diagnosis || '');
      setHasChanges(false);
    }
  }, [procedure]);

  // Mark as changed when any field changes
  const handleFieldChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string,
  ) => {
    setter(value);
    setHasChanges(true);
  };

  // Save notes to database
  const handleSave = async () => {
    if (!procedureId) return;

    try {
      await saveNotes.mutateAsync({
        procedureId,
        notes: {
          procedure_notes: procedureNotes || undefined,
          findings: findings || undefined,
          technique_description: techniqueDescription || undefined,
          complications: complications || undefined,
          estimated_blood_loss_ml: estimatedBloodLoss
            ? parseInt(estimatedBloodLoss, 10)
            : undefined,
          post_op_instructions: postOpInstructions || undefined,
          post_op_diagnosis: postOpDiagnosis || undefined,
        },
      });
      setHasChanges(false);
      setLastSaved(new Date());
      clearDraft();
    } catch (error) {
      console.error('Failed to save procedure notes:', error);
    }
  };

  if (loadingProcedure) {
    return <SkeletonForm fields={4} hasButtons={false} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            Procedure Documentation
          </h3>
          <p className="text-sm text-gray-500">
            Document findings, technique, and post-operative care
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveNotes.isPending}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              hasChanges
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saveNotes.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveNotes.isPending
              ? 'Saving...'
              : hasChanges
                ? 'Save Changes'
                : 'Saved'}
          </button>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-700">
            You have unsaved changes
          </span>
        </div>
      )}

      {/* Notes Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Procedure Notes */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium text-gray-900">Procedure Notes</h4>
          </div>
          <textarea
            value={procedureNotes}
            onChange={(e) =>
              handleFieldChange(setProcedureNotes, e.target.value)
            }
            rows={5}
            placeholder="Document the procedure steps, observations, and relevant details..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Findings */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope className="h-5 w-5 text-purple-600" />
            <h4 className="font-medium text-gray-900">Findings</h4>
          </div>
          <textarea
            value={findings}
            onChange={(e) => handleFieldChange(setFindings, e.target.value)}
            rows={5}
            placeholder="Document findings during the procedure (e.g., lesions, abnormalities, tissue condition)..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
          />
        </div>

        {/* Technique Description */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            <h4 className="font-medium text-gray-900">Technique Description</h4>
          </div>
          <textarea
            value={techniqueDescription}
            onChange={(e) =>
              handleFieldChange(setTechniqueDescription, e.target.value)
            }
            rows={5}
            placeholder="Describe the surgical/procedural technique used..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Complications */}
        <div className="bg-white rounded-xl border shadow-sm p-6 border-l-4 border-l-red-400">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h4 className="font-medium text-gray-900">Complications</h4>
          </div>
          <textarea
            value={complications}
            onChange={(e) =>
              handleFieldChange(setComplications, e.target.value)
            }
            rows={5}
            placeholder="Document any complications that occurred during or after the procedure..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
          />
          {complications && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  This procedure will be flagged for complications review.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Estimated Blood Loss */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Syringe className="h-5 w-5 text-rose-600" />
            <h4 className="font-medium text-gray-900">Estimated Blood Loss</h4>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={estimatedBloodLoss}
              onChange={(e) =>
                handleFieldChange(setEstimatedBloodLoss, e.target.value)
              }
              placeholder="0"
              min="0"
              className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
            <span className="text-gray-600 font-medium">mL</span>
          </div>
          {parseInt(estimatedBloodLoss || '0') > 500 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-sm text-amber-700">
                Significant blood loss (&gt;500mL) - ensure proper documentation
                and follow-up.
              </span>
            </div>
          )}
        </div>

        {/* Post-Op Diagnosis */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-gray-900">
              Post-Operative Diagnosis
            </h4>
          </div>
          <textarea
            value={postOpDiagnosis}
            onChange={(e) =>
              handleFieldChange(setPostOpDiagnosis, e.target.value)
            }
            rows={3}
            placeholder="Final diagnosis after procedure completion..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
          />
        </div>
      </div>

      {/* Post-Operative Instructions - Full Width */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="h-5 w-5 text-teal-600" />
          <h4 className="font-medium text-gray-900">
            Post-Operative Instructions
          </h4>
        </div>
        <textarea
          value={postOpInstructions}
          onChange={(e) =>
            handleFieldChange(setPostOpInstructions, e.target.value)
          }
          rows={4}
          placeholder="Instructions for patient care after the procedure (medications, activity restrictions, follow-up appointments, warning signs)..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
        />
      </div>

      {/* Bottom Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saveNotes.isPending}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
            hasChanges
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saveNotes.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          {saveNotes.isPending ? 'Saving...' : 'Save All Notes'}
        </button>
      </div>
    </div>
  );
};

export default ProcedureNotes;
