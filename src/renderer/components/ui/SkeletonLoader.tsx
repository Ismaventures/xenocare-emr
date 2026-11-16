/**
 * Skeleton Loader Components
 * ==========================
 * Reusable skeleton loader components for improved perceived performance
 * during data fetching on slow or unstable network connections.
 */

import React from 'react';

// Base skeleton pulse animation class
const pulseClass = 'animate-pulse bg-gray-200 rounded';

/**
 * Basic skeleton element with customizable dimensions
 */
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = 'md',
}) => {
  const roundedClass = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }[rounded];

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height)
    style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`animate-pulse bg-gray-200 ${roundedClass} ${className}`}
      style={style}
    />
  );
};

/**
 * Text line skeleton
 */
interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  className = '',
  lastLineWidth = '60%',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`${pulseClass} h-4`}
          style={{
            width: index === lines - 1 ? lastLineWidth : '100%',
          }}
        />
      ))}
    </div>
  );
};

/**
 * Avatar skeleton
 */
interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }[size];

  return (
    <div className={`${pulseClass} rounded-full ${sizeClass} ${className}`} />
  );
};

/**
 * Button skeleton
 */
interface SkeletonButtonProps {
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  className?: string;
}

export const SkeletonButton: React.FC<SkeletonButtonProps> = ({
  size = 'md',
  width,
  className = '',
}) => {
  const sizeClass = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32',
  }[size];

  return (
    <div
      className={`${pulseClass} ${sizeClass} ${className}`}
      style={
        width
          ? { width: typeof width === 'number' ? `${width}px` : width }
          : undefined
      }
    />
  );
};

/**
 * Card skeleton
 */
interface SkeletonCardProps {
  hasImage?: boolean;
  hasAvatar?: boolean;
  lines?: number;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  hasImage = false,
  hasAvatar = false,
  lines = 3,
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
    >
      {hasImage && <Skeleton className="w-full h-40 mb-4" rounded="lg" />}

      <div className="flex items-start gap-3">
        {hasAvatar && <SkeletonAvatar size="md" />}

        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-3" />
          <SkeletonText lines={lines} />
        </div>
      </div>
    </div>
  );
};

/**
 * Request card skeleton (for clinical requests)
 */
export const SkeletonRequestCard: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10" rounded="lg" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-20" rounded="full" />
      </div>

      <div className="space-y-2 mb-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
};

/**
 * Table skeleton
 */
interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  hasHeader = true,
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}
    >
      {/* Header */}
      {hasHeader && (
        <div className="flex gap-4 p-4 bg-gray-50 border-b border-gray-200">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton
              key={`header-${index}`}
              className="h-4 flex-1"
              width={index === 0 ? '30%' : undefined}
            />
          ))}
        </div>
      )}

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="flex gap-4 p-4 border-b border-gray-100 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-4 flex-1"
              width={colIndex === 0 ? '30%' : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Form skeleton
 */
interface SkeletonFormProps {
  fields?: number;
  hasButtons?: boolean;
  className?: string;
}

export const SkeletonForm: React.FC<SkeletonFormProps> = ({
  fields = 4,
  hasButtons = true,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index}>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}

      {hasButtons && (
        <div className="flex gap-3 pt-4">
          <SkeletonButton size="md" width={100} />
          <SkeletonButton size="md" width={80} />
        </div>
      )}
    </div>
  );
};

/**
 * Ward/Bed grid skeleton
 */
interface SkeletonWardGridProps {
  count?: number;
  className?: string;
}

export const SkeletonWardGrid: React.FC<SkeletonWardGridProps> = ({
  count = 6,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="p-3 rounded-lg border-2 border-gray-200 bg-white"
        >
          <Skeleton className="h-5 w-3/4 mb-2" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16" rounded="full" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Bed grid skeleton
 */
interface SkeletonBedGridProps {
  count?: number;
  className?: string;
}

export const SkeletonBedGrid: React.FC<SkeletonBedGridProps> = ({
  count = 12,
  className = '',
}) => {
  return (
    <div
      className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 ${className}`}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="p-2 rounded-lg border-2 border-gray-200 bg-white text-center"
        >
          <Skeleton className="h-5 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
      ))}
    </div>
  );
};

/**
 * List item skeleton
 */
interface SkeletonListItemProps {
  hasAvatar?: boolean;
  hasAction?: boolean;
  className?: string;
}

export const SkeletonListItem: React.FC<SkeletonListItemProps> = ({
  hasAvatar = true,
  hasAction = true,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 p-3 ${className}`}>
      {hasAvatar && <SkeletonAvatar size="md" />}
      <div className="flex-1">
        <Skeleton className="h-4 w-3/4 mb-1" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      {hasAction && <Skeleton className="h-8 w-8" rounded="lg" />}
    </div>
  );
};

/**
 * List skeleton
 */
interface SkeletonListProps {
  count?: number;
  hasAvatar?: boolean;
  hasAction?: boolean;
  className?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  hasAvatar = true,
  hasAction = true,
  className = '',
}) => {
  return (
    <div className={`divide-y divide-gray-100 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonListItem
          key={index}
          hasAvatar={hasAvatar}
          hasAction={hasAction}
        />
      ))}
    </div>
  );
};

/**
 * Stats card skeleton
 */
export const SkeletonStatsCard: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8" rounded="lg" />
      </div>
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
};

/**
 * Dashboard skeleton with stats and content
 */
export const SkeletonDashboard: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonStatsCard key={index} />
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>

      {/* Table */}
      <SkeletonTable rows={5} columns={5} />
    </div>
  );
};

/**
 * Page header skeleton
 */
export const SkeletonPageHeader: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-2">
        <SkeletonButton size="md" />
        <SkeletonButton size="md" />
      </div>
    </div>
  );
};

/**
 * Modal content skeleton
 */
interface SkeletonModalContentProps {
  hasHeader?: boolean;
  sections?: number;
  className?: string;
}

export const SkeletonModalContent: React.FC<SkeletonModalContentProps> = ({
  hasHeader = true,
  sections = 2,
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {hasHeader && (
        <div className="pb-4 border-b border-gray-200">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      )}

      {Array.from({ length: sections }).map((_, index) => (
        <div key={index}>
          <Skeleton className="h-5 w-32 mb-3" />
          <SkeletonForm fields={3} hasButtons={false} />
        </div>
      ))}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <SkeletonButton size="md" width={80} />
        <SkeletonButton size="md" width={100} />
      </div>
    </div>
  );
};

/**
 * Encounter Detail Skeleton - for EncounterCentricView
 */
export const SkeletonEncounterDetail: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12" rounded="full" />
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" rounded="lg" />
            <Skeleton className="h-8 w-8" rounded="lg" />
          </div>
        </div>
      </div>

      {/* Module tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 flex-shrink-0" rounded="lg" />
        ))}
      </div>

      {/* Content area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column - Vitals/Stats */}
        <div className="bg-white rounded-lg border p-4">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Right column - Notes */}
        <div className="bg-white rounded-lg border p-4">
          <Skeleton className="h-5 w-28 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 border rounded-lg">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom section - Results/Orders */}
      <div className="bg-white rounded-lg border p-4">
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8" rounded="lg" />
                <div>
                  <Skeleton className="h-4 w-40 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-20" rounded="full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Encounter List Skeleton - for sidebar encounter list
 */
export const SkeletonEncounterList: React.FC<{
  count?: number;
  className?: string;
}> = ({ count = 5, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 border rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16" rounded="full" />
          </div>
          <Skeleton className="h-3 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
};

export default {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonRequestCard,
  SkeletonTable,
  SkeletonForm,
  SkeletonWardGrid,
  SkeletonBedGrid,
  SkeletonListItem,
  SkeletonList,
  SkeletonStatsCard,
  SkeletonDashboard,
  SkeletonPageHeader,
  SkeletonModalContent,
  SkeletonEncounterDetail,
  SkeletonEncounterList,
};
