/**
 * =============================================================================
 * SpecialtyNoteFields — Dynamic field renderer for clinical note templates
 * =============================================================================
 * Renders specialty extension fields defined in NoteTemplateSchema.
 * Reuses the same field types as SpecialtyExaminationRenderer but is
 * purpose-built for the clinical notes modal context.
 * =============================================================================
 */

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import type {
  NoteTemplateSection,
  NoteTemplateField,
  NoteTemplateSchema,
} from '../../dtos/clinical-note-template.types';
import type {
  NumberFieldConfig,
  SelectFieldConfig,
  TextareaFieldConfig,
  ScaleFieldConfig,
  CheckboxGroupFieldConfig,
  FieldOption,
} from '../../dtos/specialty-template.dto';
import { SelectWithOther } from '../../../shared/components/SelectWithOther';

// =============================================================================
// Props
// =============================================================================

interface SpecialtyNoteFieldsProps {
  schema: NoteTemplateSchema;
  values: Record<string, unknown>;
  onChange: (fieldCode: string, value: unknown) => void;
  disabled?: boolean;
}

// =============================================================================
// Width classes
// =============================================================================

function widthClass(width?: string): string {
  switch (width) {
    case 'full':
      return 'col-span-12';
    case 'half':
      return 'col-span-12 md:col-span-6';
    case 'third':
      return 'col-span-12 md:col-span-4';
    case 'quarter':
      return 'col-span-12 md:col-span-3';
    default:
      return 'col-span-12';
  }
}

// =============================================================================
// Individual Field Renderers
// =============================================================================

function renderTextField(
  field: NoteTemplateField,
  value: string,
  onChange: (v: string) => void,
  disabled?: boolean,
) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
    />
  );
}

function renderTextareaField(
  field: NoteTemplateField,
  value: string,
  onChange: (v: string) => void,
  disabled?: boolean,
) {
  const config = field.config as TextareaFieldConfig;
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      rows={config?.rows || 3}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-50"
    />
  );
}

function renderNumberField(
  field: NoteTemplateField,
  value: number | string,
  onChange: (v: number | string) => void,
  disabled?: boolean,
) {
  const config = field.config as NumberFieldConfig;
  return (
    <div className="relative">
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) =>
          onChange(e.target.value === '' ? '' : Number(e.target.value))
        }
        min={config?.min}
        max={config?.max}
        step={config?.step || 1}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
      />
      {config?.unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          {config.unit}
        </span>
      )}
    </div>
  );
}

function renderSelectField(
  field: NoteTemplateField,
  value: string,
  onChange: (v: string) => void,
  disabled?: boolean,
) {
  const config = field.config as SelectFieldConfig;
  const options: FieldOption[] = config?.options || [];
  const selectOptions = options.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));
  return (
    <SelectWithOther
      fieldId={`template:${field.field_code}`}
      value={value || ''}
      onChange={onChange}
      options={selectOptions}
      disabled={disabled}
    />
  );
}

function renderRadioField(
  field: NoteTemplateField,
  value: string,
  onChange: (v: string) => void,
  disabled?: boolean,
) {
  const config = field.config as SelectFieldConfig;
  const options: FieldOption[] = config?.options || [];
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg cursor-pointer transition-all ${
            value === opt.value
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <input
            type="radio"
            name={field.field_code}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            disabled={disabled}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

function renderCheckboxField(
  field: NoteTemplateField,
  value: boolean,
  onChange: (v: boolean) => void,
  disabled?: boolean,
) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
      <span className="text-sm text-gray-700">{field.field_label}</span>
    </label>
  );
}

function renderCheckboxGroupField(
  field: NoteTemplateField,
  value: string[],
  onChange: (v: string[]) => void,
  disabled?: boolean,
) {
  const config = field.config as CheckboxGroupFieldConfig;
  const options: FieldOption[] = config?.options || [];
  const columns = config?.columns || 2;
  const selected = Array.isArray(value) ? value : [];

  const toggleOption = (optValue: string) => {
    if (selected.includes(optValue)) {
      onChange(selected.filter((v) => v !== optValue));
    } else {
      onChange([...selected, optValue]);
    }
  };

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`inline-flex items-center gap-2 px-2 py-1.5 text-sm border rounded cursor-pointer transition-colors ${
            selected.includes(opt.value)
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt.value)}
            onChange={() => toggleOption(opt.value)}
            disabled={disabled}
            className="h-3.5 w-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

function renderScaleField(
  field: NoteTemplateField,
  value: number | string,
  onChange: (v: number) => void,
  disabled?: boolean,
) {
  const config = field.config as ScaleFieldConfig;
  const min = config?.scale_min ?? 0;
  const max = config?.scale_max ?? 10;
  const labels = config?.scale_labels || [];
  const currentValue = typeof value === 'number' ? value : min;

  return (
    <div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={config?.scale_step || 1}
          value={currentValue}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <span className="text-lg font-bold text-gray-900 w-8 text-center">
          {currentValue}
        </span>
      </div>
      {labels.length > 0 && (
        <div className="flex justify-between mt-1">
          {labels.map((label, i) => (
            <span key={i} className="text-xs text-gray-400">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function renderDateField(
  field: NoteTemplateField,
  value: string,
  onChange: (v: string) => void,
  disabled?: boolean,
) {
  return (
    <input
      type="date"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
    />
  );
}

// =============================================================================
// Field Dispatcher
// =============================================================================

function FieldRenderer({
  field,
  value,
  onChange,
  disabled,
}: {
  field: NoteTemplateField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  switch (field.field_type) {
    case 'text':
      return renderTextField(
        field,
        value as string,
        onChange as (v: string) => void,
        disabled,
      );
    case 'textarea':
    case 'rich_text':
      return renderTextareaField(
        field,
        value as string,
        onChange as (v: string) => void,
        disabled,
      );
    case 'number':
    case 'measurement':
      return renderNumberField(
        field,
        value as number,
        onChange as (v: number | string) => void,
        disabled,
      );
    case 'select':
    case 'multiselect':
      return renderSelectField(
        field,
        value as string,
        onChange as (v: string) => void,
        disabled,
      );
    case 'radio':
      return renderRadioField(
        field,
        value as string,
        onChange as (v: string) => void,
        disabled,
      );
    case 'checkbox':
      return renderCheckboxField(
        field,
        value as boolean,
        onChange as (v: boolean) => void,
        disabled,
      );
    case 'checkbox_group':
      return renderCheckboxGroupField(
        field,
        value as string[],
        onChange as (v: string[]) => void,
        disabled,
      );
    case 'scale':
      return renderScaleField(
        field,
        value as number,
        onChange as (v: number) => void,
        disabled,
      );
    case 'date':
      return renderDateField(
        field,
        value as string,
        onChange as (v: string) => void,
        disabled,
      );
    default:
      return renderTextField(
        field,
        value as string,
        onChange as (v: string) => void,
        disabled,
      );
  }
}

// =============================================================================
// Section Renderer (collapsible)
// =============================================================================

function SectionRenderer({
  section,
  values,
  onChange,
  disabled,
}: {
  section: NoteTemplateSection;
  values: Record<string, unknown>;
  onChange: (fieldCode: string, value: unknown) => void;
  disabled?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(
    section.default_expanded !== false,
  );

  const sortedFields = [...section.fields].sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0),
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Section Header */}
      <button
        type="button"
        onClick={() =>
          section.is_collapsible !== false && setIsExpanded(!isExpanded)
        }
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 transition-colors"
      >
        <h4 className="text-sm font-semibold text-slate-800">
          {section.section_name}
        </h4>
        {section.is_collapsible !== false &&
          (isExpanded ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          ))}
      </button>

      {/* Section Fields */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 grid grid-cols-12 gap-4">
          {sortedFields.map((field) => (
            <div key={field.field_code} className={widthClass(field.width)}>
              {field.field_type !== 'checkbox' && (
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {field.field_label}
                  {field.is_required && (
                    <span className="text-red-500 ml-0.5">*</span>
                  )}
                  {field.help_text && (
                    <span className="ml-1 inline-block" title={field.help_text}>
                      <HelpCircle size={12} className="inline text-gray-400" />
                    </span>
                  )}
                </label>
              )}
              <FieldRenderer
                field={field}
                value={values[field.field_code]}
                onChange={(v) => onChange(field.field_code, v)}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function SpecialtyNoteFields({
  schema,
  values,
  onChange,
  disabled,
}: SpecialtyNoteFieldsProps) {
  if (!schema?.sections || schema.sections.length === 0) {
    return null;
  }

  const sortedSections = [...schema.sections].sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0),
  );

  return (
    <div className="space-y-4">
      {sortedSections.map((section) => (
        <SectionRenderer
          key={section.section_code}
          section={section}
          values={values}
          onChange={onChange}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
