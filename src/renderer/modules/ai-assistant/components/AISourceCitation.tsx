/**
 * AISourceCitation — displays source record citations for AI responses.
 */
import React from 'react';
import { ExternalLink, Calendar, Database } from 'lucide-react';

interface Source {
  source_table?: string;
  source_id?: string;
  encounter_date?: string;
  content?: string;
  similarity?: number;
}

interface AISourceCitationProps {
  sources: Source[];
  className?: string;
}

function normalizeSourceContent(value: unknown): string {
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

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatTable(table: string): string {
  return table.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(date: string | undefined): string {
  if (!date) return 'Unknown date';
  try {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return date;
  }
}

export function AISourceCitation({
  sources,
  className = '',
}: AISourceCitationProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Sources ({sources.length})
      </h4>
      <div className="space-y-1">
        {sources.map((source, i) => (
          (() => {
            const preview = normalizeSourceContent(source.content);

            return (
              <div
                key={`${source.source_table}-${source.source_id}-${i}`}
                className="flex items-start gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800 text-xs"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Database className="w-3 h-3 shrink-0" />
                    <span className="font-medium">
                      {formatTable(source.source_table || 'unknown')}
                    </span>
                    <Calendar className="w-3 h-3 shrink-0 ml-1" />
                    <span>{formatDate(source.encounter_date)}</span>
                    {source.similarity !== undefined && (
                      <span className="ml-auto text-gray-400">
                        {Math.round(source.similarity * 100)}% match
                      </span>
                    )}
                  </div>
                  {preview && (
                    <p className="mt-1 text-gray-500 dark:text-gray-400 line-clamp-2">
                      {preview.substring(0, 200)}
                      {preview.length > 200 ? '…' : ''}
                    </p>
                  )}
                </div>
              </div>
            );
          })()
        ))}
      </div>
    </div>
  );
}
