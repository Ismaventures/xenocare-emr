import React, { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { useGuidance } from '../../contexts/GuidanceContext';

interface InlineGuidanceProps {
  module: string; // The module name e.g. 'surgery', 'nhis'
  title?: string;
  message: string | React.ReactNode;
  step?: number;
  totalSteps?: number;
  className?: string;
  dismissible?: boolean;
  /** Glass style for dark / gradient heroes (e.g. registration banner) */
  variant?: 'default' | 'onDark';
}

export const InlineGuidance: React.FC<InlineGuidanceProps> = ({
  module,
  title,
  message,
  step,
  totalSteps,
  className = '',
  dismissible = true,
  variant = 'default',
}) => {
  const { isGuidanceEnabled, isModuleGuidanceEnabled } = useGuidance();
  const [dismissed, setDismissed] = useState(false);

  // If guidance is disabled globally or for this module, don't render
  if (!isGuidanceEnabled || !isModuleGuidanceEnabled(module)) {
    return null;
  }

  if (dismissible && dismissed) {
    return null;
  }

  const shell =
    variant === 'onDark'
      ? 'bg-white/12 backdrop-blur-md border border-white/25 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.25)] rounded-2xl p-4'
      : 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4';

  return (
    <div className={`${shell} ${className} animate-fade-in`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Lightbulb
            className={`h-5 w-5 ${variant === 'onDark' ? 'text-amber-200' : 'text-blue-600'}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4
              className={`text-sm font-semibold mb-1 ${variant === 'onDark' ? 'text-white' : 'text-blue-900'}`}
            >
              {title}
              {step && totalSteps && (
                <span
                  className={`ml-2 text-xs font-normal px-2 py-0.5 rounded-full ${
                    variant === 'onDark'
                      ? 'text-white/90 bg-white/15'
                      : 'text-blue-700 bg-blue-100'
                  }`}
                >
                  Step {step} of {totalSteps}
                </span>
              )}
            </h4>
          )}
          <div
            className={`text-sm leading-relaxed ${variant === 'onDark' ? 'text-white/90' : 'text-blue-800'}`}
          >
            {message}
          </div>
        </div>
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className={`flex-shrink-0 transition-colors ${
              variant === 'onDark'
                ? 'text-white/50 hover:text-white'
                : 'text-blue-400 hover:text-blue-600'
            }`}
            title="Dismiss hint"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
