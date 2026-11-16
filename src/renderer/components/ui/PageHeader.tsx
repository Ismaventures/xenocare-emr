/**
 * =============================================================================
 * XENOCARE EMR - PageHeader Component
 *
 * Unified page header for all modules. Eliminates per-module header chaos
 * by providing a single, consistent pattern.
 *
 * Usage:
 *   <PageHeader
 *     title="Laboratory"
 *     subtitle="Manage test requests, results and verification"
 *     icon={FlaskConical}
 *     badge={{ label: '12 Pending', variant: 'warning' }}
 *     actions={<Button>New Request</Button>}
 *     stats={[
 *       { label: 'Pending', value: 14, variant: 'warning' },
 *       { label: 'Completed', value: 87, variant: 'success' },
 *     ]}
 *   />
 * =============================================================================
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface HeaderBadge {
  label: string;
  variant?: BadgeVariant;
}

interface HeaderStat {
  label: string;
  value: string | number;
  variant?: BadgeVariant;
  change?: { value: string; positive: boolean };
}

interface PageHeaderProps {
  /** Page title — e.g. "Laboratory", "Billing & Payments" */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Lucide icon component */
  icon?: LucideIcon;
  /** Badge next to title */
  badge?: HeaderBadge;
  /** Right-aligned action buttons */
  actions?: React.ReactNode;
  /** Optional inline stats row below title */
  stats?: HeaderStat[];
  /** Optional children rendered below the header */
  children?: React.ReactNode;
  /** Optional className for the outer container */
  className?: string;
}

const badgeColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
};

const statAccentColors: Record<BadgeVariant, string> = {
  default: 'text-gray-900',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  info: 'text-blue-700',
};

const iconBgColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-600',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-600',
  info: 'bg-blue-50 text-blue-600',
};

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  stats,
  children,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="px-6 py-4">
        {/* Top Row: Icon + Title + Badge + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div
                className={`p-2.5 rounded-xl ${iconBgColors[badge?.variant || 'default']}`}
              >
                <Icon size={20} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-gray-900 leading-tight">
                  {title}
                </h1>
                {badge && (
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeColors[badge.variant || 'default']}`}
                  >
                    {badge.label}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>

        {/* Optional Stats Row */}
        {stats && stats.length > 0 && (
          <div className="flex items-center gap-6 mt-4 pt-3 border-t border-gray-100">
            {stats.map((stat, i) => (
              <React.Fragment key={stat.label}>
                {i > 0 && <div className="w-px h-8 bg-gray-100" />}
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                    {stat.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-lg font-bold ${statAccentColors[stat.variant || 'default']}`}
                    >
                      {stat.value}
                    </span>
                    {stat.change && (
                      <span
                        className={`text-xs font-medium ${stat.change.positive ? 'text-emerald-600' : 'text-red-500'}`}
                      >
                        {stat.change.positive ? '↑' : '↓'} {stat.change.value}
                      </span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Optional children — e.g. tabs or filter bar */}
      {children}
    </div>
  );
}

export default PageHeader;
