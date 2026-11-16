// =============================================================================
// TriageAcuityBadge — Color-coded acuity display
// =============================================================================

import React from 'react';
import {
  triageLevelLabel,
  triageLevelToAcuityColor,
  acuityColorToClasses,
} from '../../api/ae.types';
import type { TriageLevel, AcuityColor } from '../../api/ae.types';

interface TriageAcuityBadgeProps {
  level?: number | null;
  color?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function TriageAcuityBadge({
  level,
  color,
  size = 'md',
}: TriageAcuityBadgeProps) {
  if (!level && !color) return null;

  const acuityColor =
    (color as AcuityColor) ||
    triageLevelToAcuityColor((level || 5) as TriageLevel);
  const classes = acuityColorToClasses(acuityColor);
  const label = level ? triageLevelLabel(level as TriageLevel) : acuityColor;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium border ${classes} ${sizeClasses[size]}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          acuityColor === 'Red'
            ? 'bg-red-500'
            : acuityColor === 'Yellow'
              ? 'bg-yellow-500'
              : 'bg-green-500'
        }`}
      />
      {level && <span>L{level}</span>}
      <span>{label}</span>
    </span>
  );
}
