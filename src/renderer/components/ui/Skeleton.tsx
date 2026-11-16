import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  circle = false,
}) => {
  const style: React.CSSProperties = {
    width,
    height,
    borderRadius: circle ? '50%' : undefined,
  };

  return (
    <div
      className={`animate-pulse bg-slate-200 rounded-md ${className}`}
      style={style}
    />
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <div
    className={`p-4 border border-slate-200 rounded-xl space-y-3 bg-white ${className}`}
  >
    <Skeleton height={24} width="60%" />
    <Skeleton height={16} width="100%" />
    <Skeleton height={16} width="80%" />
  </div>
);
