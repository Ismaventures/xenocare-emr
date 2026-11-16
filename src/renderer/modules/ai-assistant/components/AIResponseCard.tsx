/**
 * AIResponseCard — renders an AI response with formatted markdown,
 * source citations, confidence indicator, and disclaimer.
 */
import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Brain,
  Clock,
  Zap,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AISourceCitation } from './AISourceCitation';
import { AIDisclaimer } from './AIDisclaimer';

interface AIResponseCardProps {
  answer: unknown;
  sources?: Array<{
    source_table?: string;
    source_id?: string;
    encounter_date?: string;
    content?: string;
    similarity?: number;
  }>;
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  model?: string;
  tokensUsed?: number;
  searchType?: string;
  resultCount?: number;
  variant?: 'full' | 'minimal';
  className?: string;
}

const CONFIDENCE_STYLES = {
  LOW: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  MEDIUM:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  HIGH: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeMarkdownAnswer(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  if (value == null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeMarkdownAnswer(entry).trim())
      .filter(Boolean)
      .join('\n\n');
  }

  if (isRecord(value)) {
    for (const key of ['answer', 'content', 'text', 'message']) {
      const candidate = value[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate;
      }
    }

    const sectionBlocks = Object.entries(value)
      .map(([key, sectionValue]) => {
        const body = normalizeMarkdownAnswer(sectionValue).trim();
        if (!body) {
          return null;
        }

        const heading = key
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .replace(/[_-]+/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());

        return `### ${heading}\n${body}`;
      })
      .filter((block): block is string => Boolean(block));

    if (sectionBlocks.length > 0) {
      return sectionBlocks.join('\n\n');
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '';
    }
  }

  return String(value);
}

export function AIResponseCard({
  answer,
  sources = [],
  confidence = 'MEDIUM',
  model,
  tokensUsed,
  searchType,
  resultCount,
  variant = 'full',
  className = '',
}: AIResponseCardProps) {
  const isMinimal = variant === 'minimal';
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const safeAnswer = normalizeMarkdownAnswer(answer);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(safeAnswer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  return (
    <div
      className={`rounded-lg ${
        isMinimal
          ? 'bg-white'
          : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      } ${className}`}
    >
      {!isMinimal && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              AI Response
            </span>
            <span
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${CONFIDENCE_STYLES[confidence]}`}
            >
              {confidence}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            {model && (
              <span className="flex items-center gap-0.5">
                <Zap className="w-3 h-3" />
                {model}
              </span>
            )}
            {tokensUsed !== undefined && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {tokensUsed} tokens
              </span>
            )}
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Copy response"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Answer Body */}
      <div className="px-4 py-3">
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-800 dark:text-gray-200">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <table
                    className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 !m-0"
                    {...props}
                  />
                </div>
              ),
              th: ({ node, ...props }) => (
                <th
                  className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  {...props}
                />
              ),
              td: ({ node, ...props }) => (
                <td
                  className="px-4 py-2.5 whitespace-nowrap text-sm border-t border-gray-100 dark:border-gray-800"
                  {...props}
                />
              ),
              h2: ({ node, ...props }) => (
                <h2
                  className="text-base font-bold text-gray-900 dark:text-gray-100 mt-6 mb-3 border-b pb-1 dark:border-gray-800"
                  {...props}
                />
              ),
              h3: ({ node, ...props }) => (
                <h3
                  className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-4 mb-2"
                  {...props}
                />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc pl-5 mt-2 mb-4 space-y-1" {...props} />
              ),
              li: ({ node, ...props }) => <li className="pl-1" {...props} />,
              p: ({ node, ...props }) => (
                <p className="mb-3 leading-relaxed" {...props} />
              ),
            }}
          >
            {safeAnswer}
          </ReactMarkdown>
        </div>
      </div>

      {/* Sources Toggle */}
      {!isMinimal && sources.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-1 w-full px-4 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            {showSources ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {resultCount ?? sources.length} source record(s)
            {searchType && (
              <span className="ml-1 text-gray-400">• {searchType} search</span>
            )}
          </button>
          {showSources && (
            <div className="px-4 pb-3">
              <AISourceCitation sources={sources} />
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      {!isMinimal && (
        <div className="px-4 pb-3">
          <AIDisclaimer compact />
        </div>
      )}
    </div>
  );
}
