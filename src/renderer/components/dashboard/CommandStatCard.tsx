import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type CommandStatTone =
  | 'slate'
  | 'blue'
  | 'indigo'
  | 'emerald'
  | 'amber'
  | 'violet'
  | 'orange'
  | 'teal';

const toneIconShell: Record<CommandStatTone, string> = {
  slate: 'bg-slate-100 text-slate-500',
  blue: 'bg-blue-50 text-blue-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  orange: 'bg-orange-50 text-orange-600',
  teal: 'bg-teal-50 text-teal-600',
};

export interface CommandStatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: CommandStatTone;
  className?: string;
}

/**
 * White “command center” metric tile: label + muted icon, large tabular value.
 * Matches modern radiology/lab-style dashboards (soft shadow, neutral chrome).
 */
export function CommandStatCard({
  label,
  value,
  icon: Icon,
  tone = 'slate',
  className = '',
}: CommandStatCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04] ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium leading-snug text-slate-600">
          {label}
        </span>
        <div className={`shrink-0 rounded-lg p-2 ${toneIconShell[tone]}`}>
          <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
    </div>
  );
}
