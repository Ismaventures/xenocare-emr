// =============================================================================
// DentalExamForm Component
// Complete dental examination form aligned with CreateDentalExamDTO types
// =============================================================================

import React, { useState, useCallback } from 'react';
import {
  Save,
  RefreshCw,
  FileText,
  Stethoscope,
  ClipboardList,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import type {
  CreateDentalExamDTO,
  DentalExamDTO,
  GingivalStatus,
  PainCharacter,
  DentalUrgency,
  RadiographType,
  OcclusionClass,
  DentalChartEntryDTO,
  CreateDentalChartEntryDTO,
} from '../types/dental.types';
import DentalChart from './DentalChart';
import SavedNotesPopover from '../../../components/ui/SavedNotesPopover';
import TemplateSearchPopover from '../../../components/ui/TemplateSearchPopover';
import {
  INPUT_CLS,
  LABEL_CLS,
  AccordionSection,
  ChipSelect,
  ToggleField,
  PainScale,
  getSectionStatus,
} from '../../../components/ui/ConsultationFormUI';

// =============================================================================
// Types
// =============================================================================

interface DentalExamFormProps {
  patientId: string;
  encounterId: string;
  consultationId?: string;
  facilityId?: string;
  existingExam?: DentalExamDTO | null;
  existingChartEntries?: DentalChartEntryDTO[];
  onSaveExam: (exam: CreateDentalExamDTO) => Promise<DentalExamDTO>;
  onSaveChartEntry: (entry: CreateDentalChartEntryDTO) => Promise<void>;
  onUpdateExam?: (
    examId: string,
    exam: Partial<CreateDentalExamDTO>,
  ) => Promise<void>;
  readOnly?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const GINGIVAL_STATUS_OPTIONS: { value: GingivalStatus; label: string }[] = [
  { value: 'Healthy', label: 'Healthy' },
  { value: 'Gingivitis', label: 'Gingivitis' },
  { value: 'Mild_Periodontitis', label: 'Mild Periodontitis' },
  { value: 'Moderate_Periodontitis', label: 'Moderate Periodontitis' },
  { value: 'Severe_Periodontitis', label: 'Severe Periodontitis' },
];

const OCCLUSION_OPTIONS: { value: OcclusionClass; label: string }[] = [
  { value: 'Class_I', label: 'Class I - Normal' },
  { value: 'Class_II_Div1', label: 'Class II Div 1' },
  { value: 'Class_II_Div2', label: 'Class II Div 2' },
  { value: 'Class_III', label: 'Class III' },
];

const PAIN_CHARACTER_OPTIONS: { value: PainCharacter; label: string }[] = [
  { value: 'Sharp', label: 'Sharp' },
  { value: 'Dull', label: 'Dull' },
  { value: 'Throbbing', label: 'Throbbing' },
  { value: 'Intermittent', label: 'Intermittent' },
  { value: 'Constant', label: 'Constant' },
];

const URGENCY_OPTIONS: { value: DentalUrgency; label: string }[] = [
  { value: 'Routine', label: 'Routine' },
  { value: 'Urgent', label: 'Urgent' },
  { value: 'Emergency', label: 'Emergency' },
];

const RADIOGRAPH_TYPE_OPTIONS: { value: RadiographType; label: string }[] = [
  { value: 'Periapical', label: 'Periapical' },
  { value: 'Bitewing', label: 'Bitewing' },
  { value: 'OPG', label: 'OPG' },
  { value: 'CBCT', label: 'CBCT' },
  { value: 'Lateral_Ceph', label: 'Lateral Ceph' },
  { value: 'Occlusal', label: 'Occlusal' },
];

// =============================================================================
// Main Component
// =============================================================================

export default function DentalExamForm({
  patientId,
  encounterId,
  consultationId,
  facilityId,
  existingExam,
  existingChartEntries,
  onSaveExam,
  onSaveChartEntry,
  onUpdateExam,
  readOnly = false,
}: DentalExamFormProps) {
  // Form state matching CreateDentalExamDTO
  const [formData, setFormData] = useState<Partial<CreateDentalExamDTO>>(
    () => ({
      patient_id: patientId,
      encounter_id: encounterId,
      consultation_id: consultationId,
      facility_id: facilityId,
      // Chief Complaint
      chief_complaint: existingExam?.chief_complaint || '',
      complaint_duration: existingExam?.complaint_duration || '',
      pain_level: existingExam?.pain_level,
      pain_character: existingExam?.pain_character,
      // History
      dental_history: existingExam?.dental_history || '',
      medical_history: existingExam?.medical_history || '',
      allergies: existingExam?.allergies || '',
      current_medications: existingExam?.current_medications || '',
      // Oral Examination
      extraoral_findings: existingExam?.extraoral_findings || '',
      intraoral_findings: existingExam?.intraoral_findings || '',
      soft_tissue_exam: existingExam?.soft_tissue_exam || '',
      hard_tissue_exam: existingExam?.hard_tissue_exam || '',
      occlusion_notes: existingExam?.occlusion_notes || '',
      occlusion_class: existingExam?.occlusion_class,
      tmj_assessment: existingExam?.tmj_assessment || '',
      // Periodontal
      gingival_status: existingExam?.gingival_status,
      bleeding_on_probing: existingExam?.bleeding_on_probing,
      plaque_score: existingExam?.plaque_score,
      calculus_present: existingExam?.calculus_present,
      pocket_depth_notes: existingExam?.pocket_depth_notes || '',
      // Radiograph
      radiograph_taken: existingExam?.radiograph_taken,
      radiograph_type: existingExam?.radiograph_type,
      radiograph_findings: existingExam?.radiograph_findings || '',
      // Diagnosis & Plan
      provisional_diagnosis: existingExam?.provisional_diagnosis || '',
      final_diagnosis: existingExam?.final_diagnosis || '',
      icd_codes: existingExam?.icd_codes || [],
      treatment_plan: existingExam?.treatment_plan || '',
      urgency: existingExam?.urgency,
      estimated_sessions: existingExam?.estimated_sessions,
      estimated_cost: existingExam?.estimated_cost,
      // Follow-up
      follow_up_required: existingExam?.follow_up_required,
      follow_up_date: existingExam?.follow_up_date || '',
      follow_up_notes: existingExam?.follow_up_notes || '',
    }),
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedExam, setSavedExam] = useState<DentalExamDTO | null>(
    existingExam || null,
  );
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>(
    'idle',
  );

  const updateField = useCallback(
    <K extends keyof CreateDentalExamDTO>(
      field: K,
      value: CreateDentalExamDTO[K] | undefined,
    ) => {
      if (readOnly) return;
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [readOnly],
  );

  const handleSave = useCallback(async () => {
    if (readOnly || !formData.patient_id || !formData.encounter_id) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      if (savedExam?.exam_id && onUpdateExam) {
        await onUpdateExam(savedExam.exam_id, formData);
      } else {
        const newExam = await onSaveExam(formData as CreateDentalExamDTO);
        setSavedExam(newExam);
      }
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save dental exam:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [formData, savedExam, onSaveExam, onUpdateExam, readOnly]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-gray-900">Dental Examination</h2>
        {!readOnly && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors
              ${isSaving ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : saveStatus === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : saveStatus === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving
              ? 'Saving...'
              : saveStatus === 'success'
                ? 'Saved!'
                : 'Save Exam'}
          </button>
        )}
      </div>

      {/* Chief Complaint Section */}
      <AccordionSection
        title="Chief Complaint"
        icon={<FileText className="h-5 w-5 text-blue-600" />}
        color="blue"
        status={getSectionStatus([formData.chief_complaint, formData.pain_level, formData.pain_character])}
        preview={[formData.chief_complaint, formData.pain_character].filter(Boolean).join(' · ')}
        defaultOpen
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className={LABEL_CLS}>Chief Complaint</label>
              <div className="flex items-center gap-1">
                <TemplateSearchPopover
                  templateType="dental"
                  category="dental_notes"
                  currentValues={{
                    chief_complaint: formData.chief_complaint || '',
                    dental_history: formData.dental_history || '',
                    medical_history: formData.medical_history || '',
                    extraoral_findings: formData.extraoral_findings || '',
                    intraoral_findings: formData.intraoral_findings || '',
                    treatment_plan: formData.treatment_plan || '',
                  }}
                  onTemplateSelect={(data) => {
                    if (data.chief_complaint) updateField('chief_complaint', data.chief_complaint);
                    if (data.dental_history) updateField('dental_history', data.dental_history);
                    if (data.medical_history) updateField('medical_history', data.medical_history);
                    if (data.extraoral_findings) updateField('extraoral_findings', data.extraoral_findings);
                    if (data.intraoral_findings) updateField('intraoral_findings', data.intraoral_findings);
                    if (data.treatment_plan) updateField('treatment_plan', data.treatment_plan);
                  }}
                  buttonText="Fill All Fields"
                />
                <SavedNotesPopover
                  category="dental_notes"
                  subcategory="chief_complaint"
                  currentValue={formData.chief_complaint || ''}
                  onInsert={(content) => updateField('chief_complaint', content)}
                />
              </div>
            </div>
            <textarea
              value={formData.chief_complaint || ''}
              onChange={(e) => updateField('chief_complaint', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Patient's main concern..."
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Duration</label>
            <input
              type="text"
              value={formData.complaint_duration || ''}
              onChange={(e) => updateField('complaint_duration', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., 2 weeks"
            />
          </div>
          <div>
            <PainScale
              label="Pain Level (0-10)"
              value={formData.pain_level}
              onChange={(val) => updateField('pain_level', val)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Pain Character</label>
            <ChipSelect
              options={PAIN_CHARACTER_OPTIONS}
              value={formData.pain_character}
              onChange={(val) => updateField('pain_character', val)}
              disabled={readOnly}
            />
          </div>
        </div>
      </AccordionSection>

      {/* History Section */}
      <AccordionSection
        title="Medical & Dental History"
        icon={<ClipboardList className="h-5 w-5 text-green-600" />}
        color="green"
        status={getSectionStatus([formData.dental_history, formData.medical_history, formData.allergies, formData.current_medications])}
        preview={[formData.dental_history, formData.allergies].filter(Boolean).join(' · ').slice(0, 60)}
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={LABEL_CLS}>Dental History</label>
              <SavedNotesPopover
                category="dental_notes"
                subcategory="dental_history"
                currentValue={formData.dental_history || ''}
                onInsert={(content) => updateField('dental_history', content)}
              />
            </div>
            <textarea
              value={formData.dental_history || ''}
              onChange={(e) => updateField('dental_history', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Previous dental treatments..."
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={LABEL_CLS}>Medical History</label>
              <SavedNotesPopover
                category="dental_notes"
                subcategory="medical_history"
                currentValue={formData.medical_history || ''}
                onInsert={(content) => updateField('medical_history', content)}
              />
            </div>
            <textarea
              value={formData.medical_history || ''}
              onChange={(e) => updateField('medical_history', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Relevant medical conditions..."
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={LABEL_CLS}>Allergies</label>
              <SavedNotesPopover
                category="dental_notes"
                subcategory="allergies"
                currentValue={formData.allergies || ''}
                onInsert={(content) => updateField('allergies', content)}
              />
            </div>
            <textarea
              value={formData.allergies || ''}
              onChange={(e) => updateField('allergies', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Drug allergies, latex..."
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={LABEL_CLS}>Current Medications</label>
              <SavedNotesPopover
                category="dental_notes"
                subcategory="current_medications"
                currentValue={formData.current_medications || ''}
                onInsert={(content) => updateField('current_medications', content)}
              />
            </div>
            <textarea
              value={formData.current_medications || ''}
              onChange={(e) => updateField('current_medications', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Current medications including anticoagulants, bisphosphonates..."
            />
          </div>
        </div>
      </AccordionSection>

      {/* Oral Examination Section */}
      <AccordionSection
        title="Oral Examination"
        icon={<Stethoscope className="h-5 w-5 text-purple-600" />}
        color="purple"
        status={getSectionStatus([formData.extraoral_findings, formData.intraoral_findings, formData.occlusion_class])}
        preview={[formData.extraoral_findings, formData.occlusion_class?.replace(/_/g, ' ')].filter(Boolean).join(' · ').slice(0, 60)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={LABEL_CLS}>Extraoral Findings</label>
              <SavedNotesPopover
                category="dental_notes"
                subcategory="extraoral_findings"
                currentValue={formData.extraoral_findings || ''}
                onInsert={(content) => updateField('extraoral_findings', content)}
              />
            </div>
            <textarea
              value={formData.extraoral_findings || ''}
              onChange={(e) => updateField('extraoral_findings', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={LABEL_CLS}>Intraoral Findings</label>
              <SavedNotesPopover
                category="dental_notes"
                subcategory="intraoral_findings"
                currentValue={formData.intraoral_findings || ''}
                onInsert={(content) => updateField('intraoral_findings', content)}
              />
            </div>
            <textarea
              value={formData.intraoral_findings || ''}
              onChange={(e) => updateField('intraoral_findings', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={LABEL_CLS}>Soft Tissue Exam</label>
              <SavedNotesPopover
                category="dental_notes"
                subcategory="soft_tissue_exam"
                currentValue={formData.soft_tissue_exam || ''}
                onInsert={(content) => updateField('soft_tissue_exam', content)}
              />
            </div>
            <textarea
              value={formData.soft_tissue_exam || ''}
              onChange={(e) => updateField('soft_tissue_exam', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={LABEL_CLS}>Hard Tissue Exam</label>
              <SavedNotesPopover
                category="dental_notes"
                subcategory="hard_tissue_exam"
                currentValue={formData.hard_tissue_exam || ''}
                onInsert={(content) => updateField('hard_tissue_exam', content)}
              />
            </div>
            <textarea
              value={formData.hard_tissue_exam || ''}
              onChange={(e) => updateField('hard_tissue_exam', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Occlusion Class</label>
            <ChipSelect
              options={OCCLUSION_OPTIONS}
              value={formData.occlusion_class}
              onChange={(val) => updateField('occlusion_class', val)}
              disabled={readOnly}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={LABEL_CLS}>TMJ Assessment</label>
              <SavedNotesPopover
                category="dental_notes"
                subcategory="tmj_assessment"
                currentValue={formData.tmj_assessment || ''}
                onInsert={(content) => updateField('tmj_assessment', content)}
              />
            </div>
            <textarea
              value={formData.tmj_assessment || ''}
              onChange={(e) => updateField('tmj_assessment', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
            />
          </div>
        </div>
      </AccordionSection>

      {/* Periodontal Assessment */}
      <AccordionSection
        title="Periodontal Assessment"
        icon={<Stethoscope className="h-5 w-5 text-red-600" />}
        color="red"
        status={getSectionStatus([formData.gingival_status, formData.plaque_score, formData.pocket_depth_notes])}
        preview={formData.gingival_status?.replace(/_/g, ' ')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Gingival Status</label>
            <ChipSelect
              options={GINGIVAL_STATUS_OPTIONS}
              value={formData.gingival_status}
              onChange={(val) => updateField('gingival_status', val as GingivalStatus | undefined)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Plaque Score (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={formData.plaque_score ?? ''}
              onChange={(e) =>
                updateField('plaque_score', e.target.value ? parseInt(e.target.value) : undefined)
              }
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
          <div className="flex items-center gap-4">
            <ToggleField
              label="Bleeding on Probing"
              checked={formData.bleeding_on_probing || false}
              onChange={(val) => updateField('bleeding_on_probing', val)}
              disabled={readOnly}
            />
          </div>
          <div className="flex items-center gap-4">
            <ToggleField
              label="Calculus Present"
              checked={formData.calculus_present || false}
              onChange={(val) => updateField('calculus_present', val)}
              disabled={readOnly}
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className={LABEL_CLS}>Pocket Depth Notes</label>
              <SavedNotesPopover
                category="dental_notes"
                subcategory="pocket_depth_notes"
                currentValue={formData.pocket_depth_notes || ''}
                onInsert={(content) => updateField('pocket_depth_notes', content)}
              />
            </div>
            <textarea
              value={formData.pocket_depth_notes || ''}
              onChange={(e) => updateField('pocket_depth_notes', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
            />
          </div>
        </div>
      </AccordionSection>

      {/* Radiograph Section */}
      <AccordionSection
        title="Radiographic Findings"
        icon={<FileText className="h-5 w-5 text-gray-600" />}
        color="gray"
        status={getSectionStatus([formData.radiograph_taken, formData.radiograph_findings])}
        preview={formData.radiograph_type?.replace(/_/g, ' ')}
      >
        <div className="space-y-4">
          <ToggleField
            label="Radiograph Taken"
            checked={formData.radiograph_taken || false}
            onChange={(val) => updateField('radiograph_taken', val)}
            disabled={readOnly}
          />
          {formData.radiograph_taken && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Radiograph Type</label>
                <ChipSelect
                  options={RADIOGRAPH_TYPE_OPTIONS}
                  value={formData.radiograph_type}
                  onChange={(val) => updateField('radiograph_type', val)}
                  disabled={readOnly}
                />
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className={LABEL_CLS}>Findings</label>
                  <SavedNotesPopover
                    category="dental_notes"
                    subcategory="radiograph_findings"
                    currentValue={formData.radiograph_findings || ''}
                    onInsert={(content) => updateField('radiograph_findings', content)}
                  />
                </div>
                <textarea
                  value={formData.radiograph_findings || ''}
                  onChange={(e) => updateField('radiograph_findings', e.target.value)}
                  disabled={readOnly}
                  className={INPUT_CLS}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* Dental Chart Section */}
      <AccordionSection
        title="Dental Chart"
        icon={<ClipboardList className="h-5 w-5 text-orange-600" />}
        color="orange"
        status={getSectionStatus([savedExam ? 'yes' : undefined])}
        preview={savedExam ? 'Chart available' : undefined}
      >
        {savedExam ? (
          <DentalChart
            patientId={patientId}
            examId={savedExam.exam_id}
            encounterId={encounterId}
            existingEntries={existingChartEntries || savedExam.dental_chart}
            onSaveEntry={onSaveChartEntry}
            readOnly={readOnly}
          />
        ) : (
          <div className="text-center py-8 text-gray-400">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Save the exam first to enable dental charting</p>
          </div>
        )}
      </AccordionSection>

      {/* Diagnosis & Treatment Plan */}
      <AccordionSection
        title="Diagnosis & Treatment Plan"
        icon={<Stethoscope className="h-5 w-5 text-indigo-600" />}
        color="indigo"
        status={getSectionStatus([formData.provisional_diagnosis, formData.treatment_plan, formData.urgency])}
        preview={formData.provisional_diagnosis?.slice(0, 60)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className={LABEL_CLS}>Provisional Diagnosis</label>
              <SavedNotesPopover
                category="dental_notes"
                subcategory="provisional_diagnosis"
                currentValue={formData.provisional_diagnosis || ''}
                onInsert={(content) => updateField('provisional_diagnosis', content)}
              />
            </div>
            <textarea
              value={formData.provisional_diagnosis || ''}
              onChange={(e) => updateField('provisional_diagnosis', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className={LABEL_CLS}>Treatment Plan</label>
              <SavedNotesPopover
                category="dental_notes"
                subcategory="treatment_plan"
                currentValue={formData.treatment_plan || ''}
                onInsert={(content) => updateField('treatment_plan', content)}
              />
            </div>
            <textarea
              value={formData.treatment_plan || ''}
              onChange={(e) => updateField('treatment_plan', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={3}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Urgency</label>
            <ChipSelect
              options={URGENCY_OPTIONS}
              value={formData.urgency}
              onChange={(val) => updateField('urgency', val as DentalUrgency | undefined)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Estimated Sessions</label>
            <input
              type="number"
              min={1}
              value={formData.estimated_sessions ?? ''}
              onChange={(e) =>
                updateField('estimated_sessions', e.target.value ? parseInt(e.target.value) : undefined)
              }
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}
