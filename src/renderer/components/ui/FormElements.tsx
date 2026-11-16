import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LucideIcon, Search, ChevronDown, Check, X } from 'lucide-react';

// =============================================================================
// Button Component
// =============================================================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon: Icon,
      iconPosition = 'left',
      isLoading = false,
      fullWidth = false,
      className = '',
      disabled,
      type = 'button', // Default to 'button' to prevent form submission
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-primary-700 text-white hover:bg-primary-800 focus:ring-primary-500',
      secondary:
        'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost:
        'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
      outline:
        'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };

    const iconSizes = {
      sm: 16,
      md: 18,
      lg: 20,
    };

    return (
      <button
        ref={ref}
        type={type}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {!isLoading && Icon && iconPosition === 'left' && (
          <Icon size={iconSizes[size]} />
        )}
        {children}
        {!isLoading && Icon && iconPosition === 'right' && (
          <Icon size={iconSizes[size]} />
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

// =============================================================================
// Input Component
// =============================================================================

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  onRightIconClick?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      onRightIconClick,
      className = '',
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {LeftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LeftIcon size={18} className="text-gray-400" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
            w-full px-4 py-2.5 border rounded-lg transition-all
            focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${LeftIcon ? 'pl-10' : ''}
            ${RightIcon ? 'pr-10' : ''}
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
            ${className}
          `}
            {...props}
          />
          {RightIcon && (
            <div
              className={`absolute inset-y-0 right-0 pr-3 flex items-center ${onRightIconClick ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'}`}
              onClick={onRightIconClick}
            >
              <RightIcon
                size={18}
                className="text-gray-400 hover:text-gray-600"
              />
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

// =============================================================================
// Select Component
// =============================================================================

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: SelectOption[];
  placeholder?: string;
  children?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      placeholder = 'Select an option',
      className = '',
      id,
      children,
      ...props
    },
    ref,
  ) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`
          w-full px-4 py-2.5 border rounded-lg transition-all appearance-none
          bg-white bg-no-repeat bg-right
          focus:ring-2 focus:ring-primary-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
          ${className}
        `}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundSize: '1.5em 1.5em',
            paddingRight: '2.5rem',
          }}
          {...props}
        >
          {!children && <option value="">{placeholder}</option>}
          {options
            ? options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';

// =============================================================================
// SearchableSelect Component
// =============================================================================

export interface SearchableSelectProps {
  label?: string;
  error?: string;
  options: readonly string[] | string[] | { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  error,
  options,
  value,
  onChange,
  onSearch,
  placeholder = 'Select an option',
  required = false,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize options to {value, label} format
  const normalizedOptions = options.map((opt) =>
    typeof opt === 'string'
      ? { value: opt, label: opt }
      : { value: opt.value || '', label: opt.label || opt.value || '' },
  );

  // Filter options based on search term
  const filteredOptions = normalizedOptions.filter((option) =>
    (option.label || '').toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Get display label for current value
  const displayLabel =
    normalizedOptions.find((opt) => opt.value === value)?.label || value;

  // Update dropdown position when opening
  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update position on scroll/resize
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      const handleScrollOrResize = () => {
        updateDropdownPosition();
      };
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchTerm(query);
    // Call external onSearch if provided
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  const handleToggle = () => {
    if (!disabled) {
      if (!isOpen) {
        updateDropdownPosition();
      }
      setIsOpen(!isOpen);
    }
  };

  // Render dropdown in portal
  const renderDropdown = () => {
    if (!isOpen) return null;

    return createPortal(
      <div
        ref={dropdownRef}
        className="fixed bg-white border border-gray-200/80 rounded-xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.15)] overflow-hidden ring-1 ring-black/[0.04]"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          zIndex: 9999,
        }}
      >
        {/* Search Input */}
        <div className="p-2 border-b border-gray-100 bg-gray-50/60">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Type to search..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-700 focus:ring-2 focus:ring-primary-700/20 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Options List */}
        <div className="max-h-60 overflow-y-auto overscroll-contain py-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.slice(0, 50).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full px-3 py-2.5 text-sm text-left flex items-center justify-between gap-2
                  transition-colors duration-100
                  ${value === option.value
                    ? 'bg-primary-700/8 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'}
                `}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && (
                  <Check size={15} className="text-primary-700 shrink-0" />
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-6 text-sm text-gray-400 text-center">
              No options found
            </div>
          )}
        </div>
      </div>,
      document.body,
    );
  };

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {/* Selected Value / Trigger */}
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`
            w-full px-3.5 py-2.5 border-2 rounded-xl text-sm text-left flex items-center justify-between gap-2
            transition-all duration-200 bg-white
            ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-60 border-gray-200' : 'hover:border-gray-300'}
            ${isOpen ? 'border-primary-700 ring-2 ring-primary-700/20 bg-white' : 'border-gray-200'}
            ${error ? 'border-red-400 bg-red-50/50' : ''}
            ${className}
          `}
        >
          <span className={`truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
            {displayLabel || placeholder}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {value && !disabled && (
              <span
                className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={handleClear}
              >
                <X size={14} />
              </span>
            )}
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {/* Dropdown rendered via portal */}
        {renderDropdown()}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

SearchableSelect.displayName = 'SearchableSelect';

// =============================================================================
// Textarea Component
// =============================================================================

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { label, error, helperText, className = '', id, rows = 4, ...props },
    ref,
  ) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`
          w-full px-4 py-2.5 border rounded-lg transition-all resize-none
          focus:ring-2 focus:ring-primary-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
          ${className}
        `}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

// =============================================================================
// Checkbox Component
// =============================================================================

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  label: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const checkboxId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className={`
            w-4 h-4 text-primary-700 border-gray-300 rounded
            focus:ring-primary-500 focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
            {...props}
          />
        </div>
        <div className="ml-3">
          <label
            htmlFor={checkboxId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';
