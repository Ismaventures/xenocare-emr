/**
 * =============================================================================
 * SPECIALTY EXAMINATION RENDERER
 *
 * Dynamic form renderer that generates examination forms based on specialty
 * templates. Renders fields, sections, and handles validation dynamically.
 *
 * This is the core component that makes template-driven specialty forms work.
 * =============================================================================
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  AlertCircle,
  HelpCircle,
  Check,
  X,
  Plus,
  Minus,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  SpecialtyTemplateSection,
  SpecialtyTemplateField,
  SpecialtyFormData,
  FieldOption,
  NumberFieldConfig,
  SelectFieldConfig,
  TextareaFieldConfig,
  ScaleFieldConfig,
  MeasurementFieldConfig,
  CheckboxGroupFieldConfig,
  ConditionalDisplay,
  SPECIALTY_COLORS,
} from '../dtos/specialty-template.dto';

// =============================================================================
// Shared Design Constants (matching physio wizard)
// =============================================================================

const INPUT_CLS =
  'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all text-sm placeholder:text-gray-300';

const LABEL_CLS = 'block text-xs font-medium text-gray-500 mb-1.5';

// Cycle section accent colors for visual variety
const SECTION_ACCENT_COLORS = [
  'blue',
  'indigo',
  'purple',
  'orange',
  'green',
  'red',
] as const;

const ACCENT_BORDER: Record<string, string> = {
  blue: 'border-l-blue-500',
  indigo: 'border-l-indigo-500',
  purple: 'border-l-purple-500',
  orange: 'border-l-amber-500',
  green: 'border-l-emerald-500',
  red: 'border-l-rose-500',
};

// =============================================================================
// Types
// =============================================================================

interface SpecialtyExaminationRendererProps {
  sections: SpecialtyTemplateSection[];
  formData: SpecialtyFormData;
  onChange: (fieldCode: string, value: unknown) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  specialtyCode?: string;
  showProgress?: boolean;
  /** Map of field_code â†’ normal value for "Mark All Normal" button */
  normalValues?: Record<string, unknown>;
}

// =============================================================================
// Field Renderer Components
// =============================================================================

/**
 * Text Input Field
 */
const TextField: React.FC<{
  field: SpecialtyTemplateField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}> = ({ field, value, onChange, error, disabled }) => (
  <input
    type="text"
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={field.placeholder}
    disabled={disabled}
    className={`${INPUT_CLS} ${
      error ? '!border-red-300 focus:!border-red-500 focus:!ring-red-50' : ''
    } ${disabled ? '!bg-gray-50 !text-gray-500' : ''}`}
  />
);

/**
 * Textarea Field with animated character counter
 */
const TextareaField: React.FC<{
  field: SpecialtyTemplateField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}> = ({ field, value, onChange, error, disabled }) => {
  const config = field.config as TextareaFieldConfig;
  const charCount = (value || '').length;
  const maxLength = config?.maxLength;
  const charPercent = maxLength ? (charCount / maxLength) * 100 : 0;

  return (
    <div className="relative group">
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        rows={config?.rows || 3}
        maxLength={maxLength}
        className={`${INPUT_CLS} resize-y min-h-[80px] ${
          error ? '!border-red-300 focus:!border-red-500 focus:!ring-red-50' : ''
        } ${disabled ? '!bg-gray-50 !text-gray-500' : ''}`}
      />
      {config?.showCharCount && maxLength && (
        <div className="absolute bottom-2 right-3 flex items-center gap-1.5">
          <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                charPercent > 90 ? 'bg-rose-400' : charPercent > 70 ? 'bg-amber-400' : 'bg-blue-400'
              }`}
              style={{ width: `${Math.min(charPercent, 100)}%` }}
            />
          </div>
          <span className={`text-[10px] font-medium tabular-nums ${
            charPercent > 90 ? 'text-rose-500' : 'text-gray-400'
          }`}>
            {charCount}/{maxLength}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Number Input Field with +/- stepper buttons
 */
const NumberField: React.FC<{
  field: SpecialtyTemplateField;
  value: number | string;
  onChange: (value: number | string) => void;
  error?: string;
  disabled?: boolean;
}> = ({ field, value, onChange, error, disabled }) => {
  const config = field.config as NumberFieldConfig;
  const step = config?.step || 1;
  const numVal = typeof value === 'number' ? value : Number(value) || 0;

  const increment = () => {
    if (disabled) return;
    const next = numVal + step;
    if (config?.max !== undefined && next > config.max) return;
    onChange(next);
  };

  const decrement = () => {
    if (disabled) return;
    const next = numVal - step;
    if (config?.min !== undefined && next < config.min) return;
    onChange(next);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || (config?.min !== undefined && numVal <= config.min)}
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
        placeholder={field.placeholder}
        disabled={disabled}
        min={config?.min}
        max={config?.max}
        step={step}
        className={`flex-1 text-center ${INPUT_CLS} ${
          error ? '!border-red-300 focus:!border-red-500 focus:!ring-red-50' : ''
        } ${disabled ? '!bg-gray-50 !text-gray-500' : ''}`}
      />
      <button
        type="button"
        onClick={increment}
        disabled={disabled || (config?.max !== undefined && numVal >= config.max)}
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
      >
        <Plus size={14} />
      </button>
      {config?.unit && (
        <span className="text-xs text-gray-400 font-medium ml-1 min-w-[30px]">
          {config.unit}
        </span>
      )}
    </div>
  );
};

/**
 * Select Field â€” uses chips for â‰¤8 options, dropdown for more
 */
const SelectField: React.FC<{
  field: SpecialtyTemplateField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}> = ({ field, value, onChange, error, disabled }) => {
  const config = field.config as SelectFieldConfig;
  const options = config?.options || [];
  const [showOther, setShowOther] = useState(value === '__other__');
  const [otherValue, setOtherValue] = useState('');

  // Use chip-style for â‰¤ 8 options (more interactive)
  if (options.length <= 8 && !config?.allowOther) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                if (disabled) return;
                onChange(isSelected ? '' : opt.value);
              }}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                isSelected
                  ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown for many options
  const handleChange = (selectedValue: string) => {
    if (selectedValue === '__other__') {
      setShowOther(true);
      onChange('');
    } else {
      setShowOther(false);
      onChange(selectedValue);
    }
  };

  return (
    <div className="space-y-2">
      <select
        value={showOther ? '__other__' : value || ''}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        className={`${INPUT_CLS} ${
          error ? '!border-red-300 focus:!border-red-500 focus:!ring-red-50' : ''
        } ${disabled ? '!bg-gray-50 !text-gray-500' : ''}`}
      >
        <option value="">{field.placeholder || 'Select...'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {config?.allowOther && (
          <option value="__other__">Other (specify)</option>
        )}
      </select>
      {showOther && config?.allowOther && (
        <input
          type="text"
          value={otherValue}
          onChange={(e) => {
            setOtherValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="Please specify..."
          className={INPUT_CLS}
        />
      )}
    </div>
  );
};

/**
 * Multi-Select Field â€” interactive chip-based tag picker
 */
const MultiSelectField: React.FC<{
  field: SpecialtyTemplateField;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  disabled?: boolean;
}> = ({ field, value = [], onChange, error, disabled }) => {
  const config = field.config as SelectFieldConfig;
  const options = config?.options || [];

  const toggleOption = (optValue: string) => {
    if (disabled) return;
    const newValue = value.includes(optValue)
      ? value.filter((v) => v !== optValue)
      : [...value, optValue];
    onChange(newValue);
  };

  // Use chip-grid for options â‰¤ 12 (more interactive than dropdown)
  if (options.length <= 12) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => {
            const isSelected = value.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleOption(opt.value)}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                  isSelected
                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isSelected && <span className="mr-1">âœ“</span>}
                {opt.label}
              </button>
            );
          })}
        </div>
        {value.length > 0 && (
          <p className="text-[11px] text-gray-400 font-medium">
            {value.length} selected
          </p>
        )}
      </div>
    );
  }

  // Dropdown for many options
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 text-sm border rounded-xl text-left flex items-center justify-between transition-all ${
          error
            ? 'border-red-300 focus:border-red-500'
            : 'border-gray-200 focus:border-blue-400'
        } ${disabled ? 'bg-gray-50 text-gray-500' : 'bg-gray-50/50'}`}
      >
        <span className={value.length ? 'text-gray-900' : 'text-gray-300'}>
          {value.length
            ? `${value.length} selected`
            : field.placeholder || 'Select options...'}
        </span>
        <ChevronDown
          size={16}
          className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                  value.includes(opt.value)
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300'
                }`}
              >
                {value.includes(opt.value) && (
                  <Check size={10} className="text-white" />
                )}
              </div>
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
              >
                {opt?.label || v}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => toggleOption(v)}
                    className="hover:text-blue-900 transition-colors"
                  >
                    <X size={11} />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Checkbox Field â€” Toggle switch (matching physio ToggleField)
 */
const CheckboxField: React.FC<{
  field: SpecialtyTemplateField;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}> = ({ field, value, onChange, disabled }) => (
  <label
    className={`flex items-center justify-between gap-3 px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl transition-colors ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white'
    }`}
  >
    <span className="text-sm font-medium text-gray-700">{field.field_label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={value || false}
      onClick={() => {
        if (!disabled) onChange(!value);
      }}
      disabled={disabled}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0 ${
        value ? 'bg-blue-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          value ? 'translate-x-[18px]' : ''
        }`}
      />
    </button>
  </label>
);

/**
 * Checkbox Group Field â€” Card-based selection with checkmarks
 */
const CheckboxGroupField: React.FC<{
  field: SpecialtyTemplateField;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  disabled?: boolean;
}> = ({ field, value = [], onChange, error, disabled }) => {
  const config = field.config as CheckboxGroupFieldConfig;
  const columns = config?.columns || 2;

  const toggleOption = (optValue: string) => {
    if (disabled) return;
    const newValue = value.includes(optValue)
      ? value.filter((v) => v !== optValue)
      : [...value, optValue];
    onChange(newValue);
  };

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {config?.options?.map((opt) => {
        const isSelected = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggleOption(opt.value)}
            disabled={disabled}
            className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all duration-150 ${
              isSelected
                ? 'border-blue-300 bg-blue-50/80 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div
              className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border shrink-0 transition-all ${
                isSelected
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-gray-300'
              }`}
            >
              {isSelected && <Check size={10} className="text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-900 font-medium">
                {opt.label}
              </span>
              {opt.description && (
                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Radio Button Field â€” Chip-style for few options, card-style for options with descriptions
 */
const RadioField: React.FC<{
  field: SpecialtyTemplateField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}> = ({ field, value, onChange, error, disabled }) => {
  const config = field.config as SelectFieldConfig;
  const options = config?.options || [];
  const hasDescriptions = options.some((o) => o.description);

  // Chip-style for simple options (â‰¤ 6 without descriptions)
  if (!hasDescriptions && options.length <= 6) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => !disabled && onChange(opt.value)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                isSelected
                  ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Card-style for options with descriptions
  return (
    <div className="space-y-1.5">
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => !disabled && onChange(opt.value)}
            disabled={disabled}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150 ${
              isSelected
                ? 'border-blue-300 bg-blue-50/80 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div
              className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                isSelected ? 'border-blue-500' : 'border-gray-300'
              }`}
            >
              {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-900 font-medium">
                {opt.label}
              </span>
              {opt.description && (
                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Date Field
 */
const DateField: React.FC<{
  field: SpecialtyTemplateField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}> = ({ field, value, onChange, error, disabled }) => (
  <input
    type="date"
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className={`${INPUT_CLS} ${
      error ? '!border-red-300 focus:!border-red-500 focus:!ring-red-50' : ''
    } ${disabled ? '!bg-gray-50 !text-gray-500' : ''}`}
  />
);

/**
 * Scale Field â€” Color gradient buttons matching physio PainScale
 */
const ScaleField: React.FC<{
  field: SpecialtyTemplateField;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  disabled?: boolean;
}> = ({ field, value, onChange, error, disabled }) => {
  const config = field.config as ScaleFieldConfig;
  const min = config?.scale_min ?? 0;
  const max = config?.scale_max ?? 10;
  const step = config?.scale_step ?? 1;
  const labels = config?.scale_labels;

  const scaleValues = [];
  for (let i = min; i <= max; i += step) {
    scaleValues.push(i);
  }

  const getScaleColor = (val: number) => {
    const percentage = (val - min) / (max - min);
    if (percentage <= 0.3) return { bg: 'bg-emerald-500', ring: 'ring-emerald-200' };
    if (percentage <= 0.6) return { bg: 'bg-amber-500', ring: 'ring-amber-200' };
    return { bg: 'bg-rose-500', ring: 'ring-rose-200' };
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {scaleValues.map((v) => {
          const isSelected = value === v;
          const { bg, ring } = getScaleColor(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => {
                if (disabled) return;
                onChange(isSelected ? undefined as unknown as number : v);
              }}
              disabled={disabled}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all duration-150 ${
                isSelected
                  ? `${bg} text-white ring-2 ring-offset-1 ${ring} scale-110`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {v}
            </button>
          );
        })}
      </div>
      {labels && labels.length > 0 && (
        <div className="flex justify-between text-[10px] text-gray-400">
          {labels.map((label, idx) => (
            <span
              key={idx}
              className={
                idx === 0
                  ? ''
                  : idx === labels.length - 1
                    ? 'text-right'
                    : 'text-center'
              }
            >
              {label}
            </span>
          ))}
        </div>
      )}
      {config?.show_numeric && value !== undefined && (
        <div className="text-center">
          <span className="inline-flex items-center px-3 py-1 bg-gray-100 rounded-full text-sm font-bold text-gray-800">
            Score: {value}/{max}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Measurement Field (e.g., Blood Pressure "120/80 mmHg")
 */
const MeasurementField: React.FC<{
  field: SpecialtyTemplateField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}> = ({ field, value, onChange, error, disabled }) => {
  const config = field.config as MeasurementFieldConfig;

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={config?.format_hint || field.placeholder}
        disabled={disabled}
        className={`flex-1 ${INPUT_CLS} ${
          error ? '!border-red-300 focus:!border-red-500 focus:!ring-red-50' : ''
        } ${disabled ? '!bg-gray-50 !text-gray-500' : ''}`}
      />
      {config?.unit && (
        <span className="px-3 py-2 text-xs bg-gray-100 text-gray-500 rounded-xl font-medium shrink-0">
          {config.unit}
        </span>
      )}
    </div>
  );
};

// =============================================================================
// Main Field Renderer
// =============================================================================

const FieldRenderer: React.FC<{
  field: SpecialtyTemplateField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}> = ({ field, value, onChange, error, disabled }) => {
  switch (field.field_type) {
    case 'text':
      return (
        <TextField
          field={field}
          value={value as string}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );
    case 'textarea':
    case 'rich_text':
      return (
        <TextareaField
          field={field}
          value={value as string}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );
    case 'number':
      return (
        <NumberField
          field={field}
          value={value as number}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );
    case 'select':
      return (
        <SelectField
          field={field}
          value={value as string}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );
    case 'multiselect':
      return (
        <MultiSelectField
          field={field}
          value={value as string[]}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );
    case 'checkbox':
      return (
        <CheckboxField
          field={field}
          value={value as boolean}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'checkbox_group':
      return (
        <CheckboxGroupField
          field={field}
          value={value as string[]}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );
    case 'radio':
      return (
        <RadioField
          field={field}
          value={value as string}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );
    case 'date':
      return (
        <DateField
          field={field}
          value={value as string}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );
    case 'scale':
      return (
        <ScaleField
          field={field}
          value={value as number}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );
    case 'measurement':
      return (
        <MeasurementField
          field={field}
          value={value as string}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );
    default:
      return (
        <TextField
          field={field}
          value={value as string}
          onChange={onChange}
          error={error}
          disabled={disabled}
        />
      );
  }
};

// =============================================================================
// Conditional Display Logic
// =============================================================================

const evaluateCondition = (
  condition: ConditionalDisplay,
  formData: SpecialtyFormData,
): boolean => {
  const fieldValue = formData[condition.field];

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;
    case 'not_equals':
      return fieldValue !== condition.value;
    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(condition.value as string);
      }
      return String(fieldValue || '').includes(String(condition.value || ''));
    case 'not_empty':
      if (Array.isArray(fieldValue)) return fieldValue.length > 0;
      return (
        fieldValue !== null && fieldValue !== undefined && fieldValue !== ''
      );
    case 'greater_than':
      return Number(fieldValue) > Number(condition.value);
    case 'less_than':
      return Number(fieldValue) < Number(condition.value);
    default:
      return true;
  }
};

const shouldShowField = (
  field: SpecialtyTemplateField,
  formData: SpecialtyFormData,
): boolean => {
  if (!field.conditional_display) return true;
  return evaluateCondition(field.conditional_display, formData);
};

// =============================================================================
// Section Component â€” AccordionSection design (matching physio wizard)
// =============================================================================

const STATUS_DOT: Record<string, string> = {
  empty: 'bg-gray-300',
  partial: 'bg-amber-400',
  complete: 'bg-emerald-500',
};

const SectionRenderer: React.FC<{
  section: SpecialtyTemplateSection;
  formData: SpecialtyFormData;
  onChange: (fieldCode: string, value: unknown) => void;
  errors: Record<string, string>;
  disabled?: boolean;
  specialtyCode?: string;
  normalValues?: Record<string, unknown>;
  accentColor: string;
}> = ({
  section,
  formData,
  onChange,
  errors,
  disabled,
  specialtyCode,
  normalValues,
  accentColor,
}) => {
  const [isExpanded, setIsExpanded] = useState(
    section.default_expanded !== false,
  );

  // Filter and sort fields
  const visibleFields = useMemo(() => {
    return section.fields
      .filter((field) => shouldShowField(field, formData))
      .sort((a, b) => a.display_order - b.display_order);
  }, [section.fields, formData]);

  // Mark section normal
  const handleMarkSectionNormal = useCallback(() => {
    section.fields.forEach((field) => {
      const normalVal = normalValues?.[field.field_code] ?? field.default_value;
      if (normalVal !== undefined) {
        onChange(field.field_code, normalVal);
      }
    });
  }, [section.fields, normalValues, onChange]);

  const hasNormalValues = useMemo(() => {
    return section.fields.some(
      (f) =>
        normalValues?.[f.field_code] !== undefined ||
        f.default_value !== undefined,
    );
  }, [section.fields, normalValues]);

  // Completion tracking
  const requiredFields = visibleFields.filter((f) => f.is_required);
  const completedRequired = requiredFields.filter((f) => {
    const val = formData[f.field_code];
    if (Array.isArray(val)) return val.length > 0;
    return val !== null && val !== undefined && val !== '';
  });
  const completionPercent = requiredFields.length
    ? Math.round((completedRequired.length / requiredFields.length) * 100)
    : 100;

  // Field width class
  const getWidthClass = (width: string | undefined) => {
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
        return 'col-span-12 md:col-span-6';
    }
  };

  const sectionStatus =
    completionPercent === 100
      ? 'complete'
      : completionPercent > 0
        ? 'partial'
        : 'empty';

  // Preview text when collapsed
  const filledCount = visibleFields.filter((f) => {
    const val = formData[f.field_code];
    if (Array.isArray(val)) return val.length > 0;
    return val !== null && val !== undefined && val !== '';
  }).length;
  const previewText =
    filledCount > 0
      ? `${filledCount}/${visibleFields.length} fields filled`
      : undefined;

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 border-l-[3px] ${ACCENT_BORDER[accentColor] || 'border-l-blue-500'} shadow-sm hover:shadow-md transition-all duration-200`}
    >
      {/* Section Header */}
      <button
        type="button"
        onClick={() => section.is_collapsible && setIsExpanded(!isExpanded)}
        className={`w-full flex items-center gap-3.5 px-5 py-4 group ${section.is_collapsible ? 'cursor-pointer' : ''}`}
      >
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[sectionStatus]} ${sectionStatus === 'partial' ? 'animate-pulse' : ''}`}
        />
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              {section.section_name}
            </h3>
            {sectionStatus === 'complete' && (
              <Check size={13} className="text-emerald-500" />
            )}
          </div>
          {!isExpanded && previewText && (
            <p className="text-xs text-gray-400 truncate mt-0.5 font-medium">
              {previewText}
            </p>
          )}
          {!isExpanded && !previewText && section.description && (
            <p className="text-xs text-gray-300 mt-0.5">
              {section.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {hasNormalValues && !disabled && isExpanded && (
            <div onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={handleMarkSectionNormal}
                className="px-3 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 transition-colors"
                title="Fill all fields in this section with normal values"
              >
                <span className="flex items-center gap-1">
                  <Check size={12} />
                  Normal
                </span>
              </button>
            </div>
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Animated Section Content */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1">
            {section.description && isExpanded && (
              <p className="text-xs text-gray-400 mb-4">
                {section.description}
              </p>
            )}
            <div className="grid grid-cols-12 gap-x-5 gap-y-4">
              {visibleFields.map((field) => {
                // Checkbox fields render their own label via ToggleField
                if (field.field_type === 'checkbox') {
                  return (
                    <div
                      key={field.id}
                      className={getWidthClass(field.width)}
                    >
                      <FieldRenderer
                        field={field}
                        value={formData[field.field_code]}
                        onChange={(value) => onChange(field.field_code, value)}
                        error={errors[field.field_code]}
                        disabled={disabled}
                      />
                      {errors[field.field_code] && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {errors[field.field_code]}
                        </p>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={field.id} className={getWidthClass(field.width)}>
                    {/* Field Label */}
                    <label className="flex items-center gap-2 mb-1.5">
                      <span className={LABEL_CLS}>
                        {field.field_label}
                      </span>
                      {field.is_required && (
                        <span className="text-rose-400 text-xs">*</span>
                      )}
                      {field.help_text && (
                        <div className="group relative">
                          <HelpCircle
                            size={13}
                            className="text-gray-300 cursor-help hover:text-gray-500 transition-colors"
                          />
                          <div className="absolute z-30 left-0 bottom-full mb-2 hidden group-hover:block w-52 p-2.5 bg-gray-900 text-white text-xs rounded-xl shadow-lg leading-relaxed">
                            {field.help_text}
                          </div>
                        </div>
                      )}
                    </label>

                    {/* Field Input */}
                    <FieldRenderer
                      field={field}
                      value={formData[field.field_code]}
                      onChange={(value) => onChange(field.field_code, value)}
                      error={errors[field.field_code]}
                      disabled={disabled}
                    />

                    {/* Error Message */}
                    {errors[field.field_code] && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {errors[field.field_code]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const SpecialtyExaminationRenderer: React.FC<
  SpecialtyExaminationRendererProps
> = ({
  sections,
  formData,
  onChange,
  errors = {},
  disabled = false,
  specialtyCode,
  showProgress = true,
  normalValues,
}) => {
  // Sort sections by display order
  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => a.display_order - b.display_order);
  }, [sections]);

  // Collect all normal values
  const allNormalValues = useMemo(() => {
    const vals: Record<string, unknown> = {};
    sections.forEach((s) => {
      s.fields.forEach((f) => {
        if (f.default_value !== undefined) {
          vals[f.field_code] = f.default_value;
        }
      });
    });
    if (normalValues) {
      Object.assign(vals, normalValues);
    }
    return vals;
  }, [sections, normalValues]);

  const hasAnyNormalValues = Object.keys(allNormalValues).length > 0;

  // Mark All Normal handler
  const handleMarkAllNormal = useCallback(() => {
    Object.entries(allNormalValues).forEach(([fieldCode, value]) => {
      onChange(fieldCode, value);
    });
  }, [allNormalValues, onChange]);

  // Progress calculation
  const totalFields = useMemo(() => {
    return sections.flatMap((s) => s.fields.filter((f) => f.is_required))
      .length;
  }, [sections]);

  const completedFields = useMemo(() => {
    return sections
      .flatMap((s) => s.fields.filter((f) => f.is_required))
      .filter((f) => {
        const val = formData[f.field_code];
        if (Array.isArray(val)) return val.length > 0;
        return val !== null && val !== undefined && val !== '';
      }).length;
  }, [sections, formData]);

  const overallProgress =
    totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 100;

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      {showProgress && totalFields > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Examination Progress
            </span>
            <span className="text-[11px] font-bold text-gray-600 tabular-nums">
              {completedFields}/{totalFields} required
            </span>
          </div>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                overallProgress === 100
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                  : 'bg-gradient-to-r from-blue-400 to-blue-500'
              }`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          {overallProgress === 100 && (
            <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1 font-medium">
              <Check size={14} />
              All required fields completed
            </p>
          )}
          {hasAnyNormalValues && !disabled && overallProgress < 100 && (
            <button
              type="button"
              onClick={handleMarkAllNormal}
              className="mt-3 w-full py-2.5 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50/50 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={14} />
              Quick Normal â€” Fill All Normal Values
            </button>
          )}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {sortedSections.map((section, idx) => (
          <SectionRenderer
            key={section.id}
            section={section}
            formData={formData}
            onChange={onChange}
            errors={errors}
            disabled={disabled}
            specialtyCode={specialtyCode}
            normalValues={allNormalValues}
            accentColor={
              SECTION_ACCENT_COLORS[idx % SECTION_ACCENT_COLORS.length]
            }
          />
        ))}
      </div>

      {/* Empty State */}
      {sortedSections.length === 0 && (
        <div className="text-center py-16 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-14 h-14 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
            <Info size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium text-sm">
            No examination template loaded
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Please select a specialty to load the examination form
          </p>
        </div>
      )}
    </div>
  );
};

export default SpecialtyExaminationRenderer;
