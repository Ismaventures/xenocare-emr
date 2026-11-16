import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useGuidance } from '../../contexts/GuidanceContext';

interface GuidanceTooltipProps {
  module: string;
  content: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

export const GuidanceTooltip: React.FC<GuidanceTooltipProps> = ({
  module,
  content,
  position = 'top',
}) => {
  const { isGuidanceEnabled, isModuleGuidanceEnabled } = useGuidance();
  const [isVisible, setIsVisible] = useState(false);

  if (!isGuidanceEnabled || !isModuleGuidanceEnabled(module)) {
    return null;
  }

  // Simple tooltip implementation
  return (
    <div className="relative inline-flex items-center ml-2 z-10 group">
      <HelpCircle
        className="h-4 w-4 text-gray-400 hover:text-blue-500 cursor-help transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      />

      {/* Tooltip Content */}
      <div
        className={`
          absolute w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg
          transition-opacity duration-200 pointer-events-none
          ${isVisible ? 'opacity-100' : 'opacity-0'}
          ${position === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' : ''}
          ${position === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' : ''}
          ${position === 'right' ? 'left-full ml-2 top-1/2 -translate-y-1/2' : ''}
          ${position === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2' : ''}
        `}
      >
        {content}
        {/* Triangle arrow */}
        <div
          className={`
             absolute w-2 h-2 bg-gray-900 transform rotate-45
             ${position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' : ''}
             ${position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' : ''}
             ${position === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2' : ''}
             ${position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' : ''}
           `}
        />
      </div>
    </div>
  );
};
