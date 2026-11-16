/**
 * AITrendInsights — displays vital sign and lab trend analysis.
 */
import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import type { TrendInsight } from '../types/ai.types';

interface AITrendInsightsProps {
  trends: TrendInsight[];
  isLoading?: boolean;
  className?: string;
}

const DIRECTION_ICONS: Record<string, React.ElementType> = {
  rising: TrendingUp,
  falling: TrendingDown,
  stable: Minus,
  fluctuating: Activity,
};

const SEVERITY_STYLES = {
  normal: 'border-gray-200 dark:border-gray-700',
  warning:
    'border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/10',
  critical:
    'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10',
};

export function AITrendInsights({
  trends,
  isLoading = false,
  className = '',
}: AITrendInsightsProps) {
  if (isLoading) {
    return (
      <div className={`animate-pulse space-y-2 p-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    );
  }

  if (!trends || trends.length === 0) {
    return (
      <div
        className={`text-sm text-gray-500 dark:text-gray-400 text-center py-4 ${className}`}
      >
        No trend data available for this patient.
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
        <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Vital Trends
        </h3>
        <span className="text-xs text-gray-400 ml-auto">
          {typeof trends[0]?.dataPoints === 'number'
            ? trends[0].dataPoints
            : Array.isArray(trends[0]?.dataPoints)
              ? trends[0].dataPoints.length
              : 0}{' '}
          data points
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
        {trends.map((trend, i) => {
          const DirectionIcon = DIRECTION_ICONS[trend.direction] || Minus;
          const severityStyle =
            SEVERITY_STYLES[trend.severity ?? 'normal'] ||
            SEVERITY_STYLES.normal;

          return (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg border ${severityStyle}`}
            >
              <div className="shrink-0 mt-0.5">
                {(trend.severity ?? 'normal') === 'critical' ? (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                ) : (
                  <DirectionIcon
                    className={`w-4 h-4 ${
                      trend.direction === 'rising'
                        ? 'text-red-500'
                        : trend.direction === 'falling'
                          ? 'text-blue-500'
                          : 'text-gray-400'
                    }`}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {trend.parameter || trend.metric}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    {trend.currentValue ?? '–'} {trend.unit ?? ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {trend.direction === 'stable'
                      ? 'Stable'
                      : `${trend.direction === 'rising' ? '↑' : '↓'} ${trend.percentChange ?? 0}%`}
                  </span>
                  {trend.normalRange && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">
                        |
                      </span>
                      <span>
                        Normal: {trend.normalRange.low}–{trend.normalRange.high}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
