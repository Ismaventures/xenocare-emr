/**
 * AICodingSuggestions — displays AI-suggested ICD-10 codes for a consultation.
 */
import React from 'react';
import { Tag, Plus, Check } from 'lucide-react';
import type { CodingSuggestion } from '../types/ai.types';
import { AIDisclaimer } from './AIDisclaimer';

interface AICodingSuggestionsProps {
  suggestions: CodingSuggestion[];
  existingCodes?: string[];
  isLoading?: boolean;
  onAddCode?: (code: string, description: string) => void;
  className?: string;
}

const CONFIDENCE_STYLES: Record<string, string> = {
  HIGH: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  MEDIUM:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  medium:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

export function AICodingSuggestions({
  suggestions,
  existingCodes = [],
  isLoading = false,
  onAddCode,
  className = '',
}: AICodingSuggestionsProps) {
  if (isLoading) {
    return (
      <div className={`animate-pulse space-y-2 p-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) return null;

  const existingSet = new Set(existingCodes);

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
        <Tag className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Suggested ICD-10 Codes
        </h3>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {suggestions.map((s, i) => {
          const alreadyAdded = existingSet.has(s.code);
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0 w-16">
                {s.code}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                  {s.description}
                </p>
                {(s.reasoning || s.basis) && (
                  <p className="text-xs text-gray-400 truncate">
                    {s.reasoning || s.basis}
                  </p>
                )}
              </div>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${CONFIDENCE_STYLES[s.confidence]}`}
              >
                {s.confidence}
              </span>
              {onAddCode && (
                <button
                  onClick={() => onAddCode(s.code, s.description)}
                  disabled={alreadyAdded}
                  className={`p-1 rounded transition-colors shrink-0 ${
                    alreadyAdded
                      ? 'text-green-500'
                      : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                  }`}
                  title={alreadyAdded ? 'Already added' : 'Add code'}
                >
                  {alreadyAdded ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
        <AIDisclaimer compact />
      </div>
    </div>
  );
}
