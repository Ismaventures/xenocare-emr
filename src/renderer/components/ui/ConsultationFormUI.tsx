/**
 * Shared modern consultation form UI components.
 *
 * Used across Dental, Ophthalmology, Physiotherapy, and all specialty clinic
 * forms to ensure a uniform, interactive design language.
 */

import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

// =============================================================================
// Constants
// =============================================================================

/** Modern input/textarea class string for all consultation forms */
export const INPUT_CLS =
  'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all text-sm placeholder:text-gray-300';

/** Compact input class for table cells and dense layouts */
export const TABLE_INPUT_CLS =
  'w-full px-2 py-1 border border-gray-200 rounded-lg bg-gray-50/50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all text-sm';

/** Modern label class string */
export const LABEL_CLS = 'block text-xs font-medium text-gray-500 mb-1.5';

/** Modern sub-heading for form sections */
export const SECTION_HEADING_CLS = 'text-[13px] font-semibold text-gray-800 tracking-tight mb-3';

export type AccordionColor = 'blue' | 'green' | 'orange' | 'red' | 'indigo' | 'purple' | 'gray';

const ACCENT_BORDER: Record<AccordionColor, string> = {
  blue: 'border-l-blue-500',
  green: 'border-l-emerald-500',
  orange: 'border-l-amber-500',
  red: 'border-l-rose-500',
  indigo: 'border-l-indigo-500',
  purple: 'border-l-purple-500',
  gray: 'border-l-gray-400',
};

const STATUS_DOT: Record<string, string> = {
  empty: 'bg-gray-300',
  partial: 'bg-amber-400',
  complete: 'bg-emerald-500',
};

// =============================================================================
// Helper
// =============================================================================

export function getSectionStatus(fields: unknown[]): 'empty' | 'partial' | 'complete' {
  const filled = fields.filter((f) => {
    if (Array.isArray(f)) return f.length > 0;
    return f !== undefined && f !== null && f !== '' && f !== false;
  });
  if (filled.length === 0) return 'empty';
  if (filled.length === fields.length) return 'complete';
  return 'partial';
}

// =============================================================================
// AccordionSection
// =============================================================================

/** Modern flat accordion with colored left accent and animated expand */
export function AccordionSection({
  title,
  subtitle,
  icon,
  color,
  status,
  preview,
  defaultOpen = false,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: AccordionColor;
  status: 'empty' | 'partial' | 'complete';
  preview?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 border-l-[3px] ${ACCENT_BORDER[color]} shadow-sm hover:shadow-md transition-all duration-200`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3.5 px-5 py-4 group"
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[status]} ${status === 'partial' ? 'animate-pulse' : ''}`} />
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">{title}</h3>
            {status === 'complete' && (
              <Check size={13} className="text-emerald-500" />
            )}
          </div>
          {!isOpen && preview ? (
            <p className="text-xs text-gray-400 truncate mt-0.5 font-medium">{preview}</p>
          ) : !isOpen && subtitle ? (
            <p className="text-xs text-gray-300 mt-0.5">{subtitle}</p>
          ) : null}
        </div>
        {isOpen && actions && (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            {actions}
          </div>
        )}
        <ChevronDown
          className={`h-4 w-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1">
            {subtitle && <p className="text-xs text-gray-400 mb-4">{subtitle}</p>}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ChipSelect
// =============================================================================

/** Clickable pill/chip selector for short option lists */
export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value?: T;
  onChange: (val: T | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => {
            if (disabled) return;
            onChange(value === opt.value ? undefined : opt.value);
          }}
          disabled={disabled}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
            value === opt.value
              ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// ToggleField
// =============================================================================

/** Modern toggle switch for boolean fields */
export function ToggleField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white'
      }`}
    >
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => {
          if (!disabled) onChange(!checked);
        }}
        disabled={disabled}
        className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0 ${
          checked ? 'bg-blue-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-[18px]' : ''
          }`}
        />
      </button>
    </label>
  );
}

// =============================================================================
// PainScale
// =============================================================================

/** Interactive NRS pain scale (0-10) with color gradient */
export function PainScale({
  value,
  onChange,
  disabled,
  label,
}: {
  value?: number;
  onChange: (val: number | undefined) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">{label}</label>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
          const isSelected = value === n;
          const bg = n <= 3 ? 'bg-emerald-500' : n <= 6 ? 'bg-amber-500' : 'bg-rose-500';
          const ring = n <= 3 ? 'ring-emerald-200' : n <= 6 ? 'ring-amber-200' : 'ring-rose-200';
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                if (!disabled) onChange(isSelected ? undefined : n);
              }}
              disabled={disabled}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all duration-150 ${
                isSelected
                  ? `${bg} text-white ring-2 ring-offset-1 ${ring} scale-110`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
