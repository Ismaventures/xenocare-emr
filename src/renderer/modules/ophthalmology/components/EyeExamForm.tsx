// =============================================================================
// EyeExamForm Component
// Main form for comprehensive eye examinations
// =============================================================================

import React, { useState, useEffect } from 'react';
import type {
  EyeExamDTO,
  CreateEyeExamDTO,
  UpdateEyeExamDTO,
  AffectedEye,
  ColorVisionMethod,
} from '../types/ophthalmology.types';
import VisualAcuitySection from './VisualAcuitySection';
import RefractionSection from './RefractionSection';
import AnteriorSegmentSection from './AnteriorSegmentSection';
import PosteriorSegmentSection from './PosteriorSegmentSection';
import {
  SelectWithOther,
  type SelectOption,
} from '../../shared/components/SelectWithOther';
import {
  INPUT_CLS,
  LABEL_CLS,
  ToggleField,
} from '../../../components/ui/ConsultationFormUI';

// =============================================================================
// Types
// =============================================================================

interface EyeExamFormProps {
  encounterId: string;
  patientId: string;
  existingExam?: EyeExamDTO;
  onSave?: (data: CreateEyeExamDTO | UpdateEyeExamDTO) => Promise<void>;
  onCancel?: () => void;
  readOnly?: boolean;
}

type TabType =
  | 'history'
  | 'visual_acuity'
  | 'refraction'
  | 'anterior'
  | 'posterior'
  | 'additional_tests'
  | 'diagnosis';

// =============================================================================
// Constants
// =============================================================================

const AFFECTED_EYE_OPTIONS: SelectOption[] = [
  { value: 'Right', label: 'Right' },
  { value: 'Left', label: 'Left' },
  { value: 'Both', label: 'Both' },
];

const TABS: { id: TabType; label: string }[] = [
  { id: 'history', label: 'History' },
  { id: 'visual_acuity', label: 'Visual Acuity & IOP' },
  { id: 'refraction', label: 'Refraction' },
  { id: 'anterior', label: 'Anterior Segment' },
  { id: 'posterior', label: 'Posterior Segment' },
  { id: 'additional_tests', label: 'Additional Tests' },
  { id: 'diagnosis', label: 'Diagnosis & Plan' },
];

const COLOR_VISION_METHOD_OPTIONS: SelectOption[] = [
  { value: 'Ishihara', label: 'Ishihara' },
  { value: 'Farnsworth_D15', label: 'Farnsworth D15' },
  { value: 'Anomaloscope', label: 'Anomaloscope' },
];

// =============================================================================
// Component
// =============================================================================

export default function EyeExamForm({
  encounterId,
  patientId,
  existingExam,
  onSave,
  onCancel,
  readOnly = false,
}: EyeExamFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<EyeExamDTO>>(() => {
    if (existingExam) return existingExam;
    return {
      encounter_id: encounterId,
      patient_id: patientId,
    };
  });

  useEffect(() => {
    if (existingExam) {
      setFormData(existingExam);
    }
  }, [existingExam]);

  const handleChange = (updates: Partial<EyeExamDTO>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSave || readOnly) return;

    setSaving(true);
    try {
      if (existingExam?.exam_id) {
        // Update existing exam
        const updateData: UpdateEyeExamDTO = {
          ...formData,
        };
        await onSave(updateData);
      } else {
        // Create new exam - send ALL form data, not just basic fields
        const createData: CreateEyeExamDTO = {
          encounter_id: formData.encounter_id || encounterId,
          patient_id: formData.patient_id || patientId,
          // Spread all form data to include all fields entered
          ...formData,
        };
        await onSave(createData);
      }
    } catch (error) {
      console.error('Failed to save eye exam:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderHistoryTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLS}>Affected Eye</label>
          <SelectWithOther
            fieldId="eye:affected_eye"
            value={formData.affected_eye || ''}
            onChange={(v) =>
              handleChange({ affected_eye: (v as AffectedEye) || undefined })
            }
            options={AFFECTED_EYE_OPTIONS}
            disabled={readOnly}
            placeholder="Select eye"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Complaint Duration</label>
          <input
            type="text"
            value={formData.complaint_duration || ''}
            onChange={(e) =>
              handleChange({ complaint_duration: e.target.value })
            }
            disabled={readOnly}
            className={INPUT_CLS}
            placeholder="e.g., 2 weeks"
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLS}>
          Chief Complaint <span className="text-rose-400">*</span>
        </label>
        <textarea
          value={formData.chief_complaint || ''}
          onChange={(e) => handleChange({ chief_complaint: e.target.value })}
          disabled={readOnly}
          rows={2}
          className={INPUT_CLS}
          placeholder="Primary reason for visit..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLS}>Ocular History</label>
          <textarea
            value={formData.ocular_history || ''}
            onChange={(e) => handleChange({ ocular_history: e.target.value })}
            disabled={readOnly}
            rows={3}
            className={INPUT_CLS}
            placeholder="Previous surgeries, conditions, treatments..."
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Ocular Surgery History</label>
          <textarea
            value={formData.ocular_surgery_history || ''}
            onChange={(e) =>
              handleChange({ ocular_surgery_history: e.target.value })
            }
            disabled={readOnly}
            rows={3}
            className={INPUT_CLS}
            placeholder="Previous eye surgeries..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLS}>Family History</label>
          <textarea
            value={formData.family_history || ''}
            onChange={(e) => handleChange({ family_history: e.target.value })}
            disabled={readOnly}
            rows={3}
            className={INPUT_CLS}
            placeholder="Glaucoma, macular degeneration, etc..."
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Systemic History</label>
          <textarea
            value={formData.systemic_history || ''}
            onChange={(e) => handleChange({ systemic_history: e.target.value })}
            disabled={readOnly}
            rows={3}
            className={INPUT_CLS}
            placeholder="DM, HTN, etc..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLS}>Current Medications</label>
          <textarea
            value={formData.current_medications || ''}
            onChange={(e) =>
              handleChange({ current_medications: e.target.value })
            }
            disabled={readOnly}
            rows={2}
            className={INPUT_CLS}
            placeholder="List current medications..."
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Drug Allergies</label>
          <textarea
            value={formData.drug_allergy || ''}
            onChange={(e) => handleChange({ drug_allergy: e.target.value })}
            disabled={readOnly}
            rows={2}
            className={INPUT_CLS}
            placeholder="Drug allergies, latex, etc..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLS}>Glasses History</label>
          <textarea
            value={formData.glasses_history || ''}
            onChange={(e) => handleChange({ glasses_history: e.target.value })}
            disabled={readOnly}
            rows={2}
            className={INPUT_CLS}
            placeholder="Previous glasses prescriptions..."
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Contact Lens History</label>
          <textarea
            value={formData.contact_lens_history || ''}
            onChange={(e) =>
              handleChange({ contact_lens_history: e.target.value })
            }
            disabled={readOnly}
            rows={2}
            className={INPUT_CLS}
            placeholder="Contact lens use, type, duration..."
          />
        </div>
      </div>
    </div>
  );

  const renderAdditionalTestsTab = () => (
    <div className="space-y-6">
      {/* Color Vision */}
      <div>
        <h4 className="text-[13px] font-semibold text-gray-800 tracking-tight mb-3">Color Vision</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Method</label>
            <SelectWithOther
              fieldId="eye:color_vision_method"
              value={formData.color_vision_method || ''}
              onChange={(v) =>
                handleChange({
                  color_vision_method: (v as ColorVisionMethod) || undefined,
                })
              }
              options={COLOR_VISION_METHOD_OPTIONS}
              disabled={readOnly}
              placeholder="Select method..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Result</label>
            <input
              type="text"
              value={formData.color_vision || ''}
              onChange={(e) => handleChange({ color_vision: e.target.value })}
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., Normal, Red-Green defect (3/17 plates)"
            />
          </div>
        </div>
      </div>

      {/* Contrast Sensitivity */}
      <div>
        <h4 className="text-[13px] font-semibold text-gray-800 tracking-tight mb-3">Contrast Sensitivity</h4>
        <textarea
          value={formData.contrast_sensitivity || ''}
          onChange={(e) =>
            handleChange({ contrast_sensitivity: e.target.value })
          }
          disabled={readOnly}
          rows={2}
          className={INPUT_CLS}
          placeholder="Contrast sensitivity findings..."
        />
      </div>

      {/* Amsler Grid */}
      <div>
        <h4 className="text-[13px] font-semibold text-gray-800 tracking-tight mb-3">Amsler Grid</h4>
        <textarea
          value={formData.amsler_grid || ''}
          onChange={(e) => handleChange({ amsler_grid: e.target.value })}
          disabled={readOnly}
          rows={2}
          className={INPUT_CLS}
          placeholder="e.g., Normal OD/OS, Central scotoma OS, Metamorphopsia..."
        />
      </div>

      {/* Schirmer Test */}
      <div>
        <h4 className="text-[13px] font-semibold text-gray-800 tracking-tight mb-3">
          Schirmer Test (Tear Production)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>OD (mm/5min)</label>
            <input
              type="number"
              value={formData.schirmer_test_right ?? ''}
              onChange={(e) =>
                handleChange({
                  schirmer_test_right: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., 15"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>OS (mm/5min)</label>
            <input
              type="number"
              value={formData.schirmer_test_left ?? ''}
              onChange={(e) =>
                handleChange({
                  schirmer_test_left: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., 15"
            />
          </div>
        </div>
        {((formData.schirmer_test_right !== undefined &&
          formData.schirmer_test_right < 10) ||
          (formData.schirmer_test_left !== undefined &&
            formData.schirmer_test_left < 10)) && (
          <p className="mt-2 text-sm text-amber-600">
            ⚠️ Low tear production ({'<'}10 mm) — suggestive of dry eye
          </p>
        )}
      </div>

      {/* Visual Field Notes */}
      <div>
        <h4 className="text-[13px] font-semibold text-gray-800 tracking-tight mb-3">
          Visual Field Assessment
        </h4>
        <textarea
          value={formData.visual_field_notes || ''}
          onChange={(e) => handleChange({ visual_field_notes: e.target.value })}
          disabled={readOnly}
          rows={3}
          className={INPUT_CLS}
          placeholder="Confrontation field results, Humphrey/Octopus perimetry findings, mean deviation, pattern standard deviation..."
        />
      </div>
    </div>
  );

  const renderDiagnosisTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLS}>Provisional Diagnosis</label>
          <textarea
            value={formData.provisional_diagnosis || ''}
            onChange={(e) =>
              handleChange({ provisional_diagnosis: e.target.value })
            }
            disabled={readOnly}
            rows={2}
            className={INPUT_CLS}
            placeholder="Initial diagnosis..."
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Final Diagnosis</label>
          <textarea
            value={formData.final_diagnosis || ''}
            onChange={(e) => handleChange({ final_diagnosis: e.target.value })}
            disabled={readOnly}
            rows={2}
            className={INPUT_CLS}
            placeholder="Confirmed diagnosis..."
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLS}>ICD Codes</label>
        <input
          type="text"
          value={formData.icd_codes?.join(', ') || ''}
          onChange={(e) =>
            handleChange({
              icd_codes: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          disabled={readOnly}
          className={INPUT_CLS}
          placeholder="e.g., H40.1, H52.0 (comma-separated)"
        />
      </div>

      <div>
        <label className={LABEL_CLS}>Treatment Plan</label>
        <textarea
          value={formData.treatment_plan || ''}
          onChange={(e) => handleChange({ treatment_plan: e.target.value })}
          disabled={readOnly}
          rows={4}
          className={INPUT_CLS}
          placeholder="Prescribed medications, procedures, recommendations..."
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ToggleField
          label="Glasses"
          checked={formData.glasses_prescribed ?? false}
          onChange={(val) => handleChange({ glasses_prescribed: val })}
          disabled={readOnly}
        />
        <ToggleField
          label="Contact Lens"
          checked={formData.contact_lens_prescribed ?? false}
          onChange={(val) => handleChange({ contact_lens_prescribed: val })}
          disabled={readOnly}
        />
        <ToggleField
          label="Medications"
          checked={formData.medications_prescribed ?? false}
          onChange={(val) => handleChange({ medications_prescribed: val })}
          disabled={readOnly}
        />
        <ToggleField
          label="Surgery"
          checked={formData.surgery_recommended ?? false}
          onChange={(val) => handleChange({ surgery_recommended: val })}
          disabled={readOnly}
        />
      </div>

      {formData.surgery_recommended && (
        <div>
          <label className={LABEL_CLS}>Surgery Type</label>
          <input
            type="text"
            value={formData.surgery_type || ''}
            onChange={(e) => handleChange({ surgery_type: e.target.value })}
            disabled={readOnly}
            className={INPUT_CLS}
            placeholder="e.g., Cataract extraction, Glaucoma surgery"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={LABEL_CLS}>Follow-up Interval</label>
          <input
            type="text"
            value={formData.follow_up_interval || ''}
            onChange={(e) =>
              handleChange({ follow_up_interval: e.target.value })
            }
            disabled={readOnly}
            className={INPUT_CLS}
            placeholder="e.g., 2 weeks"
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Follow-up Date</label>
          <input
            type="date"
            value={formData.follow_up_date?.split('T')[0] || ''}
            onChange={(e) => handleChange({ follow_up_date: e.target.value })}
            disabled={readOnly}
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Follow-up Notes</label>
          <input
            type="text"
            value={formData.follow_up_notes || ''}
            onChange={(e) => handleChange({ follow_up_notes: e.target.value })}
            disabled={readOnly}
            className={INPUT_CLS}
            placeholder="Special instructions..."
          />
        </div>
      </div>

      {/* Referral Section */}
      <div className="border-t border-gray-100 pt-4">
        <ToggleField
          label="Referral Needed"
          checked={formData.referral_needed ?? false}
          onChange={(val) => handleChange({ referral_needed: val })}
          disabled={readOnly}
        />
        {formData.referral_needed && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className={LABEL_CLS}>Refer To</label>
              <input
                type="text"
                value={formData.referral_to || ''}
                onChange={(e) => handleChange({ referral_to: e.target.value })}
                disabled={readOnly}
                className={INPUT_CLS}
                placeholder="e.g., Retina specialist"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Referral Reason</label>
              <input
                type="text"
                value={formData.referral_reason || ''}
                onChange={(e) =>
                  handleChange({ referral_reason: e.target.value })
                }
                disabled={readOnly}
                className={INPUT_CLS}
                placeholder="Reason for referral..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tabs - Pill-based */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-gray-50/80 rounded-2xl border border-gray-100">
        {TABS.map((tab, idx) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'visual_acuity' && (
          <VisualAcuitySection
            data={formData}
            onChange={handleChange}
            readOnly={readOnly}
          />
        )}
        {activeTab === 'refraction' && (
          <RefractionSection
            data={formData}
            onChange={handleChange}
            readOnly={readOnly}
          />
        )}
        {activeTab === 'anterior' && (
          <AnteriorSegmentSection
            data={formData}
            onChange={handleChange}
            readOnly={readOnly}
          />
        )}
        {activeTab === 'posterior' && (
          <PosteriorSegmentSection
            data={formData}
            onChange={handleChange}
            readOnly={readOnly}
          />
        )}
        {activeTab === 'additional_tests' && renderAdditionalTestsTab()}
        {activeTab === 'diagnosis' && renderDiagnosisTab()}
      </div>

      {/* Action Buttons */}
      {!readOnly && (
        <div className="flex justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {saving ? 'Saving...' : existingExam ? 'Update Exam' : 'Save Exam'}
          </button>
        </div>
      )}
    </form>
  );
}
