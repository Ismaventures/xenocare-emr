/**
 * =============================================================================
 * SelectWithOther — Dropdown with persistent "Other" option
 * =============================================================================
 * A drop-in replacement for <select> that:
 *   1. Appends an "Other" option at the bottom
 *   2. When "Other" is selected, shows a text input
 *   3. On submit, persists the custom value to the DB
 *   4. On next render, custom values appear as regular options
 * =============================================================================
 */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { Plus, Check, X } from 'lucide-react';
import { useCustomFieldOptions } from '../hooks/useCustomFieldOptions';

const OTHER_SENTINEL = '__other__';

export interface SelectOption {
  value: string;
  label: string;
}

/** Accepts both string[] and SelectOption[] */
export type SelectOptionInput = string | SelectOption;

interface SelectWithOtherProps {
  /** Unique identifier for persisting custom options, e.g. "eye:iop_method" */
  fieldId: string;
  value: string;
  onChange: (value: string) => void;
  /** Built-in/hardcoded options — accepts string[] or SelectOption[] */
  options: readonly SelectOptionInput[] | SelectOptionInput[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SelectWithOther({
  fieldId,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled,
  className,
}: SelectWithOtherProps) {
  const { customOptions, addOption, isAdding } = useCustomFieldOptions(fieldId);
  const [isOtherMode, setIsOtherMode] = useState(false);
  const [otherText, setOtherText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize options: accept both string[] and SelectOption[]
  const normalizedOptions = useMemo<SelectOption[]>(
    () =>
      options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
    [options],
  );

  // Build merged options: hardcoded + custom + "Other"
  const customSelectOptions: SelectOption[] = customOptions.map((co) => ({
    value: co.option_value,
    label: co.option_label,
  }));

  // Deduplicate: skip custom options whose value already exists in hardcoded
  const hardcodedValues = new Set(normalizedOptions.map((o) => o.value));
  const uniqueCustom = customSelectOptions.filter(
    (co) => !hardcodedValues.has(co.value),
  );

  const allOptions = [...normalizedOptions, ...uniqueCustom];

  // Focus input when entering other mode
  useEffect(() => {
    if (isOtherMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOtherMode]);

  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (val === OTHER_SENTINEL) {
        setIsOtherMode(true);
        setOtherText('');
      } else {
        setIsOtherMode(false);
        onChange(val);
      }
    },
    [onChange],
  );

  const handleOtherSubmit = useCallback(async () => {
    const trimmed = otherText.trim();
    if (!trimmed) {
      setIsOtherMode(false);
      return;
    }

    const result = await addOption(trimmed);
    if (result) {
      onChange(result.option_value);
    }
    setIsOtherMode(false);
    setOtherText('');
  }, [otherText, addOption, onChange]);

  const handleOtherCancel = useCallback(() => {
    setIsOtherMode(false);
    setOtherText('');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleOtherSubmit();
      } else if (e.key === 'Escape') {
        handleOtherCancel();
      }
    },
    [handleOtherSubmit, handleOtherCancel],
  );

  const baseClass =
    className ||
    'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50';

  if (isOtherMode) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay to allow button clicks to register
            setTimeout(() => {
              if (otherText.trim()) handleOtherSubmit();
              else handleOtherCancel();
            }, 150);
          }}
          placeholder="Type custom option..."
          disabled={isAdding}
          className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50"
        />
        <button
          type="button"
          onClick={handleOtherSubmit}
          disabled={isAdding || !otherText.trim()}
          className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-40"
          title="Save custom option"
        >
          <Check size={16} />
        </button>
        <button
          type="button"
          onClick={handleOtherCancel}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          title="Cancel"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <select
      value={value || ''}
      onChange={handleSelectChange}
      disabled={disabled}
      className={baseClass}
    >
      <option value="">{placeholder}</option>
      {allOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
      <option value={OTHER_SENTINEL}>⊕ Other (add new)</option>
    </select>
  );
}
