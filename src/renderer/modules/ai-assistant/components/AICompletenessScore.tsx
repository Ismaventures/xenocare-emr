/**
 * AICompletenessScore — visual display of documentation completeness.
 */
import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  ClipboardCheck,
} from 'lucide-react';
import type { CompletenessScore } from '../types/ai.types';

interface AICompletenessScoreProps {
  score: CompletenessScore | null;
  compact?: boolean;
  className?: string;
}

const GRADE_STYLES: Record<string, { color: string; icon: React.ElementType }> =
  {
    A: { color: 'text-green-600 dark:text-green-400', icon: CheckCircle2 },
    B: { color: 'text-green-600 dark:text-green-400', icon: CheckCircle2 },
    C: { color: 'text-yellow-600 dark:text-yellow-400', icon: AlertCircle },
    D: { color: 'text-orange-600 dark:text-orange-400', icon: AlertCircle },
    F: { color: 'text-red-600 dark:text-red-400', icon: XCircle },
  };

export function AICompletenessScore({
  score,
  compact = false,
  className = '',
}: AICompletenessScoreProps) {
  if (!score) return null;

  const gradeStyle = GRADE_STYLES[score.grade ?? 'C'] || GRADE_STYLES.C;
  const GradeIcon = gradeStyle.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <GradeIcon className={`w-4 h-4 ${gradeStyle.color}`} />
        <span className={`text-sm font-bold ${gradeStyle.color}`}>
          {score.score}%
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          completeness
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Documentation Completeness
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <GradeIcon className={`w-5 h-5 ${gradeStyle.color}`} />
          <span className={`text-lg font-bold ${gradeStyle.color}`}>
            {score.score}%
          </span>
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded ${gradeStyle.color} bg-gray-100 dark:bg-gray-700`}
          >
            Grade {score.grade}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3">
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              score.score >= 75
                ? 'bg-green-500'
                : score.score >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${score.score}%` }}
          />
        </div>
      </div>

      {/* Missing Fields */}
      {(score.missingFields ?? []).length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Missing:
          </p>
          <div className="flex flex-wrap gap-1">
            {(score.missingFields ?? []).map((field) => (
              <span
                key={field}
                className="px-2 py-0.5 text-xs rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300"
              >
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {(score.suggestions ?? []).length > 0 && (
        <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700 pt-2">
          <ul className="space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
            {(score.suggestions ?? []).slice(0, 4).map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
