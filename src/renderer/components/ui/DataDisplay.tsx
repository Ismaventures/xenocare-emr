import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
} from 'lucide-react';
import { useTimeTheme } from '../../hooks/useTimeTheme';
import { SkeletonTable } from './SkeletonLoader';

// =============================================================================
// Table Component
// =============================================================================

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField?: keyof T;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyState?: React.ReactNode;
  onRowClick?: (item: T) => void;
  selectedRow?: T | null;
  rowClassName?: (item: T) => string;
  /** Polished “command center” chrome: uppercase headers, comfortable row padding. */
  surface?: 'default' | 'command';
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<T extends object>({
  data,
  columns,
  keyField,
  isLoading = false,
  emptyMessage = 'No data available',
  emptyState,
  onRowClick,
  selectedRow,
  rowClassName,
  surface = 'default',
  pagination,
}: DataTableProps<T>) {
  const isCommand = surface === 'command';
  const getCellValue = (item: T, key: string): unknown => {
    const keys = key.split('.');
    let value: unknown = item;
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }
    return value;
  };

  if (isLoading) {
    return <SkeletonTable rows={5} columns={columns.length} />;
  }

  return (
    <div
      className={
        isCommand
          ? 'overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.04]'
          : 'overflow-hidden rounded-lg border border-gray-200 bg-white'
      }
    >
      <div className="overflow-x-auto">
        <table
          className={`min-w-full divide-y ${isCommand ? 'divide-slate-100' : 'divide-gray-200'}`}
        >
          <thead
            className={
              isCommand
                ? 'border-b border-slate-200 bg-slate-50/90'
                : 'bg-gray-50'
            }
          >
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`text-left uppercase ${
                    isCommand
                      ? 'px-5 py-3.5 text-[11px] font-semibold tracking-wide text-slate-500'
                      : 'px-6 py-3 text-xs font-medium tracking-wider text-gray-500'
                  } ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className={`divide-y bg-white ${isCommand ? 'divide-slate-100' : 'divide-gray-200'}`}
          >
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={`py-12 text-center text-gray-500 ${isCommand ? 'px-5' : 'px-6'}`}
                >
                  {emptyState || (
                    <EmptyState
                      icon={FileText}
                      title="No Data Found"
                      description={emptyMessage}
                    />
                  )}
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const deriveRowKey = (row: T): string => {
                  if (keyField && row[keyField] != null)
                    return String(row[keyField]);
                  const maybeId = (row as Record<string, unknown>).id;
                  if (maybeId != null) return String(maybeId);
                  const composite = columns
                    .map((column) =>
                      String(getCellValue(row, String(column.key)) ?? ''),
                    )
                    .join('|');
                  return composite || JSON.stringify(row);
                };
                const rowKey = deriveRowKey(item);
                const isSelected =
                  selectedRow &&
                  keyField &&
                  selectedRow[keyField] === item[keyField];
                const customRowClass = rowClassName ? rowClassName(item) : '';
                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick?.(item)}
                    className={`
                      ${onRowClick ? (isCommand ? 'cursor-pointer hover:bg-slate-50/80' : 'cursor-pointer hover:bg-gray-50') : ''}
                      ${isSelected ? 'bg-blue-50' : ''}
                      ${customRowClass}
                    `}
                  >
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className={`whitespace-nowrap text-sm ${
                          isCommand ? 'px-5 py-4 text-slate-800' : 'px-6 py-4'
                        } ${column.className || ''}`}
                      >
                        {column.render
                          ? column.render(item)
                          : String(
                              getCellValue(item, String(column.key)) ?? '-',
                            )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div
          className={`flex items-center justify-between border-t px-6 py-3 ${
            isCommand
              ? 'border-slate-100 bg-slate-50/50 text-slate-600'
              : 'border-gray-200 bg-gray-50 text-gray-500'
          }`}
        >
          <div className="text-sm">
            Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}{' '}
            to{' '}
            {Math.min(
              pagination.currentPage * pagination.itemsPerPage,
              pagination.totalItems,
            )}{' '}
            of {pagination.totalItems} results
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.currentPage === 1}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsLeft size={18} />
            </button>
            <button
              onClick={() =>
                pagination.onPageChange(pagination.currentPage - 1)
              }
              disabled={pagination.currentPage === 1}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 py-1 text-sm">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() =>
                pagination.onPageChange(pagination.currentPage + 1)
              }
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.totalPages)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Status Badge Component
// =============================================================================

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  color?: string; // Legacy support
}

export function StatusBadge({
  status,
  variant = 'neutral',
  color,
}: StatusBadgeProps) {
  const { isNightMode } = useTimeTheme();

  const statusVariantsDay: Record<string, string> = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    neutral: 'bg-gray-100 text-gray-800',
    // Color mappings
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
    cyan: 'bg-cyan-100 text-cyan-800',
  };

  const statusVariantsNight: Record<string, string> = {
    success: 'bg-green-900/50 text-green-300',
    warning: 'bg-yellow-900/50 text-yellow-300',
    danger: 'bg-red-900/50 text-red-300',
    info: 'bg-blue-900/50 text-blue-300',
    neutral: 'bg-slate-700 text-slate-300',
    // Color mappings
    green: 'bg-green-900/50 text-green-300',
    yellow: 'bg-yellow-900/50 text-yellow-300',
    red: 'bg-red-900/50 text-red-300',
    blue: 'bg-blue-900/50 text-blue-300',
    gray: 'bg-slate-700 text-slate-300',
    purple: 'bg-purple-900/50 text-purple-300',
    orange: 'bg-orange-900/50 text-orange-300',
    cyan: 'bg-cyan-900/50 text-cyan-300',
  };

  const statusVariants = isNightMode ? statusVariantsNight : statusVariantsDay;

  const colorClass = color
    ? statusVariants[color] || statusVariants.neutral
    : statusVariants[variant];
  return (
    <span
      className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${colorClass}`}
    >
      {status}
    </span>
  );
}

// =============================================================================
// Priority Badge
// =============================================================================

interface PriorityBadgeProps {
  priority: 'Normal' | 'Urgent' | 'Emergency';
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const variants = {
    Normal: 'neutral' as const,
    Urgent: 'warning' as const,
    Emergency: 'danger' as const,
  };

  return <StatusBadge status={priority} variant={variants[priority]} />;
}

// =============================================================================
// Empty State Component
// =============================================================================

interface EmptyStateProps {
  icon?: React.ReactNode | React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'card' | 'inline';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  const { isNightMode } = useTimeTheme();

  // Render icon - handle both component and element
  const renderIcon = () => {
    if (!Icon) return null;

    if (React.isValidElement(Icon)) {
      return Icon;
    }

    const IconComponent = Icon as React.ElementType;
    return <IconComponent size={variant === 'inline' ? 24 : 32} />;
  };

  const iconContainerClasses = isNightMode
    ? `flex items-center justify-center text-slate-400 ${
        variant === 'inline'
          ? 'w-10 h-10 bg-slate-700 rounded-lg mr-4'
          : 'w-16 h-16 bg-slate-700 rounded-full mb-4'
      }`
    : `flex items-center justify-center text-gray-400 ${
        variant === 'inline'
          ? 'w-10 h-10 bg-gray-100 rounded-lg mr-4'
          : 'w-16 h-16 bg-gray-100 rounded-full mb-4'
      }`;

  const titleClasses = isNightMode
    ? `font-medium text-slate-200 ${variant === 'inline' ? 'text-base' : 'text-lg mb-1'}`
    : `font-medium text-gray-900 ${variant === 'inline' ? 'text-base' : 'text-lg mb-1'}`;

  const descClasses = isNightMode
    ? `text-slate-400 max-w-sm ${variant === 'inline' ? 'text-sm' : 'mb-4'}`
    : `text-gray-500 max-w-sm ${variant === 'inline' ? 'text-sm' : 'mb-4'}`;

  const containerClasses = `
    flex ${variant === 'inline' ? 'flex-row items-center text-left py-4 px-4' : 'flex-col items-center justify-center py-12 px-4 text-center'}
    ${variant === 'card' ? (isNightMode ? 'bg-slate-800/50 border border-dashed border-slate-700 rounded-xl' : 'bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-xl') : ''}
  `;

  return (
    <div className={containerClasses}>
      {Icon && <div className={iconContainerClasses}>{renderIcon()}</div>}
      <div className={variant === 'inline' ? 'flex-1' : ''}>
        <h3 className={titleClasses}>{title}</h3>
        {description && <p className={descClasses}>{description}</p>}
      </div>
      {action && (
        <div className={variant === 'inline' ? 'ml-4' : ''}>{action}</div>
      )}
    </div>
  );
}

// =============================================================================
// Card Component
// =============================================================================

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({
  children,
  title,
  subtitle,
  action,
  className = '',
  noPadding = false,
}: CardProps) {
  const { isNightMode } = useTimeTheme();

  const cardClasses = isNightMode
    ? `bg-slate-800 rounded-lg border border-slate-700 shadow-sm ${className}`
    : `bg-white rounded-lg border border-gray-200 shadow-sm ${className}`;

  const headerBorderClasses = isNightMode
    ? 'border-b border-slate-700'
    : 'border-b border-gray-200';

  const titleClasses = isNightMode
    ? 'text-lg font-semibold text-slate-100'
    : 'text-lg font-semibold text-gray-900';

  const subtitleClasses = isNightMode
    ? 'text-sm text-slate-400 mt-0.5'
    : 'text-sm text-gray-500 mt-0.5';

  return (
    <div className={cardClasses}>
      {(title || action) && (
        <div
          className={`flex items-center justify-between px-6 py-4 ${headerBorderClasses}`}
        >
          <div>
            {title && <h3 className={titleClasses}>{title}</h3>}
            {subtitle && <p className={subtitleClasses}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
}

// =============================================================================
// Stats Card - Professional Unified Design
// =============================================================================

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?:
    | React.ReactNode
    | React.ComponentType<{ size?: string | number; className?: string }>;
  iconColor?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  color?: string; // Legacy support for color prop
  subtitle?: string;
}

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
  variant = 'default',
  color,
  subtitle,
}: StatsCardProps) {
  const { isNightMode } = useTimeTheme();

  // Unified neutral icon background with subtle accent colors
  const iconBgMap: Record<string, string> = isNightMode
    ? {
        blue: 'bg-slate-700 text-slate-300',
        green: 'bg-slate-700 text-emerald-400',
        yellow: 'bg-slate-700 text-amber-400',
        red: 'bg-slate-700 text-rose-400',
        purple: 'bg-slate-700 text-violet-400',
        pink: 'bg-slate-700 text-pink-400',
        cyan: 'bg-slate-700 text-cyan-400',
        orange: 'bg-slate-700 text-orange-400',
        emerald: 'bg-slate-700 text-emerald-400',
        teal: 'bg-slate-700 text-teal-400',
        violet: 'bg-slate-700 text-violet-400',
      }
    : {
        blue: 'bg-slate-100 text-slate-600',
        green: 'bg-slate-100 text-emerald-600',
        yellow: 'bg-slate-100 text-amber-600',
        red: 'bg-slate-100 text-rose-600',
        purple: 'bg-slate-100 text-violet-600',
        pink: 'bg-slate-100 text-pink-600',
        cyan: 'bg-slate-100 text-cyan-600',
        orange: 'bg-slate-100 text-orange-600',
        emerald: 'bg-slate-100 text-emerald-600',
        teal: 'bg-slate-100 text-teal-600',
        violet: 'bg-slate-100 text-violet-600',
      };

  // Variant colors with neutral backgrounds
  const variantColors = isNightMode
    ? {
        default: 'bg-slate-700 text-slate-300',
        success: 'bg-slate-700 text-emerald-400',
        warning: 'bg-slate-700 text-amber-400',
        error: 'bg-slate-700 text-rose-400',
        info: 'bg-slate-700 text-sky-400',
      }
    : {
        default: 'bg-slate-100 text-slate-600',
        success: 'bg-slate-100 text-emerald-600',
        warning: 'bg-slate-100 text-amber-600',
        error: 'bg-slate-100 text-rose-600',
        info: 'bg-slate-100 text-sky-600',
      };

  const finalIconColor =
    iconColor || (color && iconBgMap[color]) || variantColors[variant];

  // Professional card styling - consistent across all modules
  const cardClasses = isNightMode
    ? 'bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 hover:border-slate-600/50 transition-all duration-200'
    : 'bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all duration-200';

  const titleClasses = isNightMode
    ? 'text-xs font-medium text-slate-400 uppercase tracking-wide'
    : 'text-xs font-medium text-slate-500 uppercase tracking-wide';

  const valueClasses = isNightMode
    ? 'text-2xl font-bold text-slate-100'
    : 'text-2xl font-bold text-slate-800';

  const subtitleClasses = isNightMode
    ? 'text-xs text-slate-500 mt-0.5'
    : 'text-xs text-slate-400 mt-0.5';

  // Render icon - handle both component and element
  const renderIcon = () => {
    if (!Icon) return null;

    // If it's already a rendered element (like <Icon />), return it
    if (React.isValidElement(Icon)) {
      return Icon;
    }

    // Otherwise treat it as a component type (function or object)
    const IconComponent = Icon as React.ElementType;
    return <IconComponent size={20} strokeWidth={2} />;
  };

  return (
    <div className={cardClasses}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`p-2.5 rounded-lg ${finalIconColor}`}>
            {renderIcon()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={titleClasses}>{title}</p>
          <div className="flex items-baseline gap-2">
            <p className={valueClasses}>{value}</p>
            {change && (
              <span
                className={`text-xs font-medium ${change.type === 'increase' ? 'text-emerald-500' : 'text-rose-500'}`}
              >
                {change.type === 'increase' ? '↑' : '↓'}{' '}
                {Math.abs(change.value)}%
              </span>
            )}
          </div>
          {subtitle && <p className={subtitleClasses}>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Tabs Component — Enterprise multi-variant
// =============================================================================

type TabVariant = 'underline' | 'pill' | 'raised';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode | React.ElementType;
  count?: number;
  disabled?: boolean;
}

/** Safely render an icon that may be a ReactNode OR a component reference (forwardRef) */
function renderTabIcon(icon: React.ReactNode | React.ElementType | undefined) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (
    typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && '$$typeof' in (icon as any))
  ) {
    const IconComp = icon as React.ElementType;
    return <IconComp className="h-4 w-4" />;
  }
  return icon as React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  /** Visual variant — underline (default), pill, or raised */
  variant?: TabVariant;
  /** Optional className for the outer container */
  className?: string;
  /** Size — compact or default */
  size?: 'sm' | 'md';
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className = '',
  size = 'md',
}: TabsProps) {
  const { isNightMode } = useTimeTheme();

  // ── Variant: underline (classic bottom-border tabs) ──
  if (variant === 'underline') {
    const borderClasses = isNightMode
      ? 'border-b border-slate-700'
      : 'border-b border-gray-200';

    const py = size === 'sm' ? 'py-2.5' : 'py-4';

    return (
      <div className={`${borderClasses} ${className}`}>
        <nav className="flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (!tab.disabled) onChange(tab.id);
              }}
              disabled={tab.disabled}
              className={`
                flex items-center gap-2 ${py} px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                ${
                  activeTab === tab.id
                    ? isNightMode
                      ? 'border-slate-400 text-slate-200'
                      : 'border-primary-700 text-primary-700'
                    : tab.disabled
                      ? isNightMode
                        ? 'border-transparent text-slate-600 cursor-not-allowed'
                        : 'border-transparent text-gray-300 cursor-not-allowed'
                      : isNightMode
                        ? 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {renderTabIcon(tab.icon)}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === tab.id
                      ? isNightMode
                        ? 'bg-slate-700 text-slate-200'
                        : 'bg-primary-50 text-primary-700'
                      : isNightMode
                        ? 'bg-slate-700 text-slate-400'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  // ── Variant: pill (rounded capsule buttons) ──
  if (variant === 'pill') {
    const gapClass = size === 'sm' ? 'gap-1.5' : 'gap-2';
    const padClass =
      size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

    return (
      <div className={`flex ${gapClass} flex-wrap ${className}`} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => {
              if (!tab.disabled) onChange(tab.id);
            }}
            disabled={tab.disabled}
            className={`
              flex items-center gap-1.5 ${padClass} font-semibold rounded-lg border transition-all
              ${
                activeTab === tab.id
                  ? isNightMode
                    ? 'bg-slate-700 text-slate-100 border-slate-600 shadow-sm'
                    : 'bg-primary-700 text-white border-primary-700 shadow-sm'
                  : tab.disabled
                    ? 'text-gray-300 border-transparent cursor-not-allowed'
                    : isNightMode
                      ? 'text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200'
                      : 'text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-800'
              }
            `}
          >
            {renderTabIcon(tab.icon)}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // ── Variant: raised (tab bar with raised active tab) ──
  const padClass = size === 'sm' ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm';

  return (
    <div
      className={`flex items-end gap-1 border-b border-gray-200 ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => {
            if (!tab.disabled) onChange(tab.id);
          }}
          disabled={tab.disabled}
          className={`
            flex items-center gap-1.5 ${padClass} font-semibold rounded-t-lg transition-all whitespace-nowrap
            ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 border border-gray-200 border-b-white -mb-px shadow-sm'
                : tab.disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          {renderTabIcon(tab.icon)}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                activeTab === tab.id
                  ? 'bg-primary-50 text-primary-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
