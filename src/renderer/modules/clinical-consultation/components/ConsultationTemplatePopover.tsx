import React, { useMemo } from 'react';
import TemplateSearchPopover from '../../../components/ui/TemplateSearchPopover';
import { CreateConsultationDTO } from '../dtos/consultation.dto';
import { SelectedComplaint } from './ChiefComplaintsSection';
import { ICDMultiSelectDiagnosis } from './ICDDiagnosisSearch';

interface ConsultationTemplateApplyPayload {
  fields: Partial<CreateConsultationDTO>;
  selectedComplaints?: SelectedComplaint[];
  selectedDiagnoses?: ICDMultiSelectDiagnosis[];
  specialtyFormData?: Record<string, unknown>;
}

interface ConsultationTemplatePopoverProps {
  formData: CreateConsultationDTO;
  selectedComplaints: SelectedComplaint[];
  selectedDiagnoses: ICDMultiSelectDiagnosis[];
  specialtyFormData?: Record<string, unknown>;
  specialtyName?: string;
  onApply: (payload: ConsultationTemplateApplyPayload) => void;
}

const TEXT_FIELDS: Array<keyof CreateConsultationDTO> = [
  'clinical_notes',
  'history_of_present_illness',
  'past_medical_history',
  'family_history',
  'social_history',
  'review_of_systems',
  'examination_findings',
  'physical_examination',
  'diagnosis',
  'treatment_plan',
  'recommendations',
  'follow_up_notes',
];

function parseJsonArray<T>(value: string | undefined): T[] | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : undefined;
  } catch {
    return undefined;
  }
}

function parseJsonObject(
  value: string | undefined,
): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export default function ConsultationTemplatePopover({
  formData,
  selectedComplaints,
  selectedDiagnoses,
  specialtyFormData,
  specialtyName,
  onApply,
}: ConsultationTemplatePopoverProps) {
  const currentValues = useMemo(() => {
    const values: Record<string, string> = {};

    TEXT_FIELDS.forEach((field) => {
      const value = formData[field];
      if (typeof value === 'string' && value.trim()) {
        values[field] = value;
      }
    });

    if (selectedComplaints.length > 0) {
      values.chief_complaints_json = JSON.stringify(selectedComplaints);
    }
    if (selectedDiagnoses.length > 0) {
      values.selected_diagnoses_json = JSON.stringify(selectedDiagnoses);
    }
    if (specialtyFormData && Object.keys(specialtyFormData).length > 0) {
      values.specialty_form_data_json = JSON.stringify(specialtyFormData);
    }

    return values;
  }, [formData, selectedComplaints, selectedDiagnoses, specialtyFormData]);

  const handleApply = (templateData: Record<string, string>) => {
    const fields: Partial<CreateConsultationDTO> = {};

    TEXT_FIELDS.forEach((field) => {
      const value = templateData[field];
      if (typeof value === 'string' && value.trim()) {
        fields[field] = value as never;
      }
    });

    onApply({
      fields,
      selectedComplaints: parseJsonArray<SelectedComplaint>(
        templateData.chief_complaints_json,
      ),
      selectedDiagnoses: parseJsonArray<ICDMultiSelectDiagnosis>(
        templateData.selected_diagnoses_json,
      ),
      specialtyFormData: parseJsonObject(
        templateData.specialty_form_data_json,
      ),
    });
  };

  return (
    <TemplateSearchPopover
      templateType="consultation"
      category="consultation"
      contextKeywords={specialtyName ? [specialtyName] : ['general medicine']}
      currentValues={currentValues}
      onTemplateSelect={handleApply}
      buttonText="Consultation Templates"
      searchTabLabel="Use Consultation Template"
      saveTabLabel="Save Consultation as Template"
      saveHint="Save the clinically relevant sections of this consultation as one reusable template. Patient identity, vitals, dates, and orders are not saved."
      saveActionLabel="Save Consultation Template"
      hideClearAction
    />
  );
}
