/**
 * Backward-compatible wrapper: routes legacy SavedNotesPopover usages
 * to the unified clinical text template system.
 */

import React from 'react';
import type { SavedNoteCategory } from '../../lib/clinician-saved-notes';
import type { TemplateModule } from '../../lib/clinical-text-templates/types';
import TemplateSearchPopover from './TemplateSearchPopover';

interface SavedNotesPopoverProps {
  category: SavedNoteCategory;
  subcategory?: string;
  currentValue: string;
  onInsert: (content: string) => void;
  className?: string;
}

interface CategoryMapping {
  module: TemplateModule;
  field: string;
  templateCategory?: string;
}

const DEFAULT_MAPPING: CategoryMapping = {
  module: 'consultation',
  field: 'plan',
};

function mapLegacyCategory(category: SavedNoteCategory, subcategory?: string): CategoryMapping {
  const map: Partial<Record<SavedNoteCategory, CategoryMapping>> = {
    radiology_findings: { module: 'radiology', field: 'findings', templateCategory: 'findings' },
    radiology_impression: { module: 'radiology', field: 'impression', templateCategory: 'findings' },
    radiology_notes: { module: 'radiology', field: 'notes', templateCategory: 'findings' },
    consultation_subjective: {
      module: 'consultation',
      field: 'history_of_presenting_complaint',
      templateCategory: 'consultation',
    },
    consultation_objective: {
      module: 'consultation',
      field: 'examination_findings',
      templateCategory: 'consultation',
    },
    consultation_assessment: {
      module: 'consultation',
      field: 'assessment',
      templateCategory: 'consultation',
    },
    consultation_plan: { module: 'consultation', field: 'plan', templateCategory: 'consultation' },
    consultation_notes: {
      module: 'consultation',
      field: 'recommendations',
      templateCategory: 'consultation',
    },
    dental_notes: { module: 'dental', field: 'treatment_notes', templateCategory: 'examination' },
    specialty_notes: { module: 'consultation', field: 'plan', templateCategory: 'consultation' },
    procedure_notes: { module: 'inpatient', field: 'procedure_notes' },
    discharge_notes: {
      module: 'inpatient',
      field: 'discharge_notes',
      templateCategory: 'discharge_summary',
    },
    admission_notes: {
      module: 'inpatient',
      field: 'admission_reason',
      templateCategory: 'discharge_summary',
    },
    surgery_notes: { module: 'surgery', field: 'postop_notes', templateCategory: 'postop' },
    anc_notes: { module: 'anc', field: 'nursing_notes', templateCategory: 'anc_visit' },
    ae_notes: { module: 'ae', field: 'clinical_notes', templateCategory: 'clinical_notes' },
    nursing_notes: { module: 'nursing', field: 'nursing_notes', templateCategory: 'nursing_notes' },
    psychiatry_notes: { module: 'consultation', field: 'assessment', templateCategory: 'consultation' },
    referral_notes: { module: 'consultation', field: 'recommendations', templateCategory: 'consultation' },
    general: DEFAULT_MAPPING,
  };

  const mapped = map[category] ?? DEFAULT_MAPPING;
  return {
    ...mapped,
    templateCategory: subcategory || mapped.templateCategory,
  };
}

export default function SavedNotesPopover({
  category,
  subcategory,
  currentValue,
  onInsert,
  className,
}: SavedNotesPopoverProps) {
  const mapped = mapLegacyCategory(category, subcategory);

  return (
    <TemplateSearchPopover
      templateType={mapped.module}
      category={mapped.templateCategory}
      currentValues={{ [mapped.field]: currentValue }}
      onTemplateSelect={(templateData) => {
        const exact = templateData[mapped.field]?.trim();
        if (exact) {
          onInsert(exact);
          return;
        }

        const firstNonEmpty = Object.values(templateData).find(
          (value) => typeof value === 'string' && value.trim().length > 0,
        );

        if (firstNonEmpty) {
          onInsert(firstNonEmpty);
        }
      }}
      buttonText="Templates"
      className={className}
    />
  );
}
